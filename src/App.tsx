import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import bs58 from 'bs58';
import { getInvalidChars } from './utils/validation';
import { encrypt, generatePassword } from './utils/crypto';
import './index.css';

type Step = 'input_chain' | 'input_char' | 'input_pos' | 'input_case' | 'generating' | 'result' | 'input_filename';
type Position = 'start' | 'end';
type Chain = 'solana' | 'bitcoin' | 'bsv';

interface GenResult {
  publicKey: string;
  secretKey: number[] | string;
  attempts: number;
  duration: number;
  chain?: Chain;
}

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'warn' | 'system';
  message: string;
}

function App() {
  const [step, setStep] = useState<Step>('input_chain');
  const [chainInput, setChainInput] = useState('');

  const [selectedChain, setSelectedChain] = useState<Chain>('solana');
  const [char, setChar] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [caseInput, setCaseInput] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [customName, setCustomName] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Worker pool state
  const workerPoolRef = useRef<Worker[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);
  const totalAttemptsRef = useRef(0);
  const lastReportTimeRef = useRef(0);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'system' = 'info', overwrite = false) => {
    const newLog = { id: logIdCounter.current++, type, message };
    setLogs(prev => {
      if (overwrite && prev.length > 0 && prev[prev.length - 1].type === 'system' && prev[prev.length - 1].message.includes('addresses scanned')) {
        return [...prev.slice(0, -1), newLog];
      }
      return [...prev.slice(-100), newLog];
    });
  };

  const terminateWorkers = () => {
    workerPoolRef.current.forEach(w => w.terminate());
    workerPoolRef.current = [];
  };

  const initWorkers = (pattern: string, position: Position, chain: Chain, caseSensitive: boolean) => {
    terminateWorkers();

    totalAttemptsRef.current = 0;
    setAttempts(0);
    lastReportTimeRef.current = Date.now();

    const cores = navigator.hardwareConcurrency || 4;
    addLog(`system: spawning ${cores} worker threads [${chain}]...`, 'system');

    for (let i = 0; i < cores; i++) {
      // Use new URL to ensure Vite bundles the worker correctly
      const worker = new Worker(new URL('./workers/vanity.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'READY') {
          console.log(`[MAIN] Worker ${i} is ready`);
          // Send work to the worker now that it's ready
          worker.postMessage({ pattern, position, chain, caseSensitive });
          return;
        }

        if (type === 'STATUS') {
          totalAttemptsRef.current += payload.attempts;
          const now = Date.now();
          if (now - lastReportTimeRef.current > 100) {
            setAttempts(totalAttemptsRef.current);
            lastReportTimeRef.current = now;
            if (totalAttemptsRef.current > 0 && totalAttemptsRef.current % 25000 < payload.attempts * cores) {
              addLog(`mining_status: ${totalAttemptsRef.current.toLocaleString()} addresses scanned...`, 'system', true);
            }
          }
        } else if (type === 'FOUND') {
          const foundPayload = payload as GenResult;
          terminateWorkers();
          setResult({
            ...foundPayload,
            attempts: totalAttemptsRef.current,
            chain // ensure chain is passed or preserved
          });
          setStep('result');
          addLog(`>> match_found: ${foundPayload.publicKey}`, 'success');

        } else if (type === 'ERROR') {
          terminateWorkers();
          setError(payload.message || 'halt: worker_error');
          setStep('input_chain');
          addLog(`>> error: ${payload.message || 'internal_fault'}`, 'warn');
        }
      };

      worker.onerror = (error) => {
        console.error('[MAIN] Worker error:', error);
        addLog(`>> worker_error: ${error.message || 'unknown error'}`, 'warn');
        terminateWorkers();
        setError('Worker failed to initialize');
        setStep('input_chain');
      };

      // Don't send work immediately - wait for READY signal
      workerPoolRef.current.push(worker);
    }
  };

  const handleChainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = chainInput.trim().toUpperCase();

    let chain: Chain | null = null;
    if (['SOL', 'SOLANA'].includes(val)) chain = 'solana';
    else if (['BTC', 'BITCOIN'].includes(val)) chain = 'bitcoin';
    else if (['BSV', 'BITCOIN SV', 'BITCOINSV'].includes(val)) chain = 'bsv';

    if (!chain) {
      setError('invalid_protocol');
      setChainInput('');
      return;
    }

    setSelectedChain(chain);
    setError(null);
    setStep('input_char');
    addLog(`network_selected: ${chain}`, 'info');
  };



  const handleCharSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!char) return;

    if (char.length > 4) {
      setError('max_length: 4 characters');
      return;
    }
    const invalid = getInvalidChars(char);
    if (invalid.length > 0) {
      setError(`invalid_charset: ${invalid.join(', ')} unavailable`);
      return;
    }

    setError(null);
    setStep('input_pos');
  };

  const handlePosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = positionInput.toLowerCase().trim();
    if (val !== 'start' && val !== 'end') {
      setError('invalid_input: type "start" or "end"');
      setPositionInput('');
      return;
    }

    setError(null);
    setStep('input_case');
  };

  const handleCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = caseInput.toLowerCase().trim();
    if (val !== 'yes' && val !== 'no') {
      setError('invalid_input: type "yes" or "no"');
      setCaseInput('');
      return;
    }

    const isCaseSensitive = val === 'yes';
    setCaseSensitive(isCaseSensitive);
    const pos = positionInput as Position;
    setError(null);
    setStep('generating');

    addLog(`crat --chain ${selectedChain} --char "${char}" --pos "${pos}" --case-sensitive ${isCaseSensitive}`, 'info');
    addLog(`initializing cluster_mode...`);

    initWorkers(char, pos, selectedChain, isCaseSensitive);
  };

  const handleStop = () => {
    terminateWorkers();
    setStep('input_chain');
    setChainInput('');

    setChar('');
    setPositionInput('');
    addLog(`process_halted: state reset`, 'warn');
  };

  const downloadKey = async () => {
    if (!result || !customName) return;
    const chainSymbol = result.chain || 'wallet';
    const filename = `${customName}_crat_${chainSymbol}.txt`;

    let privateKeyRaw = '';
    if (typeof result.secretKey === 'string') {
      privateKeyRaw = result.secretKey; // WIF for BTC/BSV
    } else {
      privateKeyRaw = bs58.encode(new Uint8Array(result.secretKey as number[])); // Base58 for Solana
    }

    // Generate a random password for encryption
    const password = generatePassword();

    // Encrypt the private key
    const encryptedKey = await encrypt(privateKeyRaw, password);

    // Create content with encrypted key and password
    const content = `Chain: ${result.chain}
Address: ${result.publicKey}

ENCRYPTED PRIVATE KEY:
${encryptedKey}

DECRYPTION PASSWORD:
${password}

⚠️  SECURITY NOTICE ⚠️
Your private key has been encrypted using AES-256-GCM encryption.
Store this file securely. Anyone with access to this file can decrypt your private key.
To decrypt: Use the password above with the encrypted key.

NEVER share this file or password with anyone.
Crat is not responsible for lost or stolen keys.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    addLog(`>> key_exported: ${filename}`, 'success');
    setStep('result'); // Go back to result view
  };

  const handleFilenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    if (!name) {
      setError('Please enter a filename');
      return;
    }
    // Validate filename (no special characters except underscore and hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Filename can only contain letters, numbers, underscores, and hyphens');
      return;
    }
    setError(null);
    downloadKey();
  };

  const initiateDownload = () => {
    setStep('input_filename');
    setCustomName('');
    setError(null);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep('input_chain');
    setChainInput('');

    setChar('');
    setPositionInput('');
    setCaseInput('');
    setCaseSensitive(false);
    setResult(null);
    setAttempts(0);
    setLogs([]);
    setError(null);
  };

  useEffect(() => {
    // Clean up on unmount
    return () => terminateWorkers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, step]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+C for both stopping generation and navigating back
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        if (step === 'generating') {
          handleStop();
        } else if (step === 'input_char') {
          setStep('input_chain');
          setChainInput('');
          setError(null);
        } else if (step === 'input_pos') {
          setStep('input_char');
          setChar('');
          setError(null);
        } else if (step === 'input_case') {
          setStep('input_pos');
          setPositionInput('');
          setError(null);
        } else if (step === 'result' || step === 'input_filename') {
          reset();
        }
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      <div className="terminal-container">
        <div className="glass-window">
          <header className="window-header">
            <div className="dot-grid">
              <div className="dot dot-red" />
              <div className="dot dot-yellow" />
              <div className="dot dot-green" />
            </div>
            <div className="window-title">Crat</div>
          </header>

          <div className="terminal-content" ref={scrollRef}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key="header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-8"
              >
                <div className="text-dim text-sm mb-1">crat_os v3.1.2 (ultra_glass_build)</div>
              </motion.div>

              {(step === 'input_chain' || step === 'input_char' || step === 'input_pos' || step === 'input_case' || step === 'generating' || step === 'result' || step === 'input_filename') && (
                <div className="flex-1 flex flex-col">
                  {/* Step 0: Chain Selection */}
                  <div className="prompt-group flex items-center">
                    <span className="prompt">select_network_protocol&gt;</span>
                    {step === 'input_chain' ? (
                      <form onSubmit={handleChainSubmit} className="inline-flex flex-1">
                        <input
                          type="text"
                          value={chainInput}
                          onChange={(e) => setChainInput(e.target.value)}
                          className="terminal-input"
                          autoFocus
                          placeholder=""
                        />
                      </form>
                    ) : (
                      <div className="text-success font-bold">
                        {selectedChain.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Step 1: Char Input */}
                  {(step === 'input_char' || step === 'input_pos' || step === 'input_case' || step === 'generating' || step === 'result' || step === 'input_filename') && (
                    <div className="prompt-group flex items-center">
                      <span className="prompt">input_char&gt;</span>
                      {step === 'input_char' ? (
                        <form onSubmit={handleCharSubmit} className="inline-flex flex-1">
                          <input
                            type="text"
                            value={char}
                            onChange={(e) => setChar(e.target.value)}
                            className="terminal-input"
                            autoFocus
                            maxLength={4}
                            placeholder=""
                          />
                        </form>
                      ) : (
                        <span className="cmd-text">{char}</span>
                      )}
                    </div>
                  )}

                  {/* Step 2: Position Input */}
                  {(step === 'input_pos' || step === 'input_case' || step === 'generating' || step === 'result' || step === 'input_filename') && (
                    <div className="prompt-group flex items-center">
                      <span className="prompt">input_position (start/end)&gt;</span>
                      {step === 'input_pos' ? (
                        <form onSubmit={handlePosSubmit} className="inline-flex flex-1">
                          <input
                            type="text"
                            value={positionInput}
                            onChange={(e) => setPositionInput(e.target.value.toLowerCase())}
                            className="terminal-input"
                            autoFocus
                            placeholder=""
                          />
                        </form>
                      ) : (
                        <span className="cmd-text">{positionInput}</span>
                      )}
                    </div>
                  )}

                  {/* Step 3: Case Sensitivity Input */}
                  {(step === 'input_case' || step === 'generating' || step === 'result' || step === 'input_filename') && (
                    <div className="prompt-group flex items-center">
                      <span className="prompt">case_sensitive (yes/no)&gt;</span>
                      {step === 'input_case' ? (
                        <form onSubmit={handleCaseSubmit} className="inline-flex flex-1">
                          <input
                            type="text"
                            value={caseInput}
                            onChange={(e) => setCaseInput(e.target.value.toLowerCase())}
                            className="terminal-input"
                            autoFocus
                            placeholder=""
                          />
                        </form>
                      ) : (
                        <span className="cmd-text">{caseSensitive ? 'yes' : 'no'}</span>
                      )}
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-error mb-4"
                    >
                      {error === 'invalid_protocol' ? (
                        <div className="flex flex-col">
                          <span>!! invalid_protocol: incompatible_chain_detected</span>
                          <span className="text-dim mt-2">compatible_protocols:</span>
                          <div className="pl-4 mt-1 flex flex-col gap-1 text-dim">
                            <span>&gt; SOLANA [SOL]</span>
                            <span>&gt; BITCOIN [BTC]</span>
                            <span>&gt; BITCOIN SV [BSV]</span>
                          </div>
                        </div>
                      ) : (
                        <span>!! {error}</span>
                      )}
                    </motion.div>
                  )}

                  {/* Mining View */}
                  {step === 'generating' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col mt-4 border-t border-black/5 pt-4"
                    >
                      <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: '200px' }}>
                        {logs.map(log => (
                          <div key={log.id} className="text-sm mb-1">
                            <span className={log.type === 'success' ? 'text-success' : log.type === 'warn' ? 'text-error' : 'text-dim'}>
                              {log.type === 'system' ? '...' : '&gt;'} {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dim">deriving_keys: {attempts.toLocaleString()}</span>
                        <div className="flex gap-4">
                          <span className="text-dim opacity-50">press [ctrl+c] to abort</span>
                          <span onClick={handleStop} className="text-link text-error">terminate</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Result View */}
                  {step === 'result' && result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 border-t border-black/5 pt-8"
                    >
                      <div className="text-success font-bold mb-4">SUCCESS: cryptographic_match_complete</div>
                      <div className="text-dim text-sm mb-8">
                        derived in {result.attempts.toLocaleString()} attempts ({result.duration.toFixed(2)}s)
                      </div>

                      <div className="bg-black/5 p-5 rounded-2xl mb-8 group relative overflow-hidden">
                        <div className="text-xs text-dim mb-2 uppercase tracking-widest">{selectedChain}_address</div>
                        <div className="break-all font-mono text-lg">{result.publicKey}</div>
                      </div>

                      <div className="result-actions">
                        <span onClick={copyToClipboard} className="text-link">
                          {copied ? 'address_copied' : 'copy_address'}
                        </span>
                        <span onClick={initiateDownload} className="text-link">
                          download_private_key
                        </span>
                        <span onClick={reset} className="text-link">
                          new_session
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Filename Input Step */}
                  {step === 'input_filename' && result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8"
                    >
                      <div className="prompt-group flex items-center">
                        <span className="prompt">enter_filename&gt;</span>
                        <form onSubmit={handleFilenameSubmit} className="inline-flex flex-1">
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value.toLowerCase())}
                            className="terminal-input"
                            autoFocus
                            placeholder="e.g. asti"
                          />
                        </form>
                      </div>
                      <div className="text-dim text-xs mt-2 ml-2">
                        File will be saved as: {customName || '[name]'}_crat_{result.chain || 'wallet'}.txt
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          <footer className="window-footer">
            <Info size={12} />
            <span>Base58 Note: 0, O, I, l are invalid characters.</span>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;
