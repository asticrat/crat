import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import bs58 from 'bs58';
import { getInvalidChars } from './utils/validation';
import './index.css';

type Step = 'input_char' | 'input_pos' | 'generating' | 'result';
type Position = 'start' | 'end';

interface GenResult {
  publicKey: string;
  secretKey: number[];
  attempts: number;
  duration: number;
}

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'warn' | 'system';
  message: string;
}

function App() {
  const [step, setStep] = useState<Step>('input_char');
  const [char, setChar] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Worker pool state
  const workerPoolRef = useRef<Worker[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);
  // We need to track total attempts across all workers
  const totalAttemptsRef = useRef(0);
  const lastReportTimeRef = useRef(0);

  useEffect(() => {
    // Clean up on unmount
    return () => terminateWorkers();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, step]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c' && step === 'generating') {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step]);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'system' = 'info', overwrite = false) => {
    const newLog = { id: logIdCounter.current++, type, message };
    setLogs(prev => {
      if (overwrite && prev.length > 0 && prev[prev.length - 1].type === 'system' && prev[prev.length - 1].message.includes('addresses scanned')) {
        // Replace the last log if it's a status update
        return [...prev.slice(0, -1), newLog];
      }
      return [...prev.slice(-100), newLog];
    });
  };

  const terminateWorkers = () => {
    workerPoolRef.current.forEach(w => w.terminate());
    workerPoolRef.current = [];
  };

  const initWorkers = (pattern: string, position: Position) => {
    terminateWorkers();

    // Reset stats
    totalAttemptsRef.current = 0;
    setAttempts(0);
    lastReportTimeRef.current = Date.now();

    // Determine thread count (default to hardware concurrency or 4)
    const cores = navigator.hardwareConcurrency || 4;
    addLog(`system: spawning ${cores} worker threads...`, 'system');

    for (let i = 0; i < cores; i++) {
      const worker = new Worker(new URL('./workers/vanity.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'STATUS') {
          // Aggregate attempts (payload.attempts is the delta since last report for that worker, 
          // OR total for that worker. 
          // To simplify, let's assume worker sends TOTAL attempts it has done.
          // Actually, summing totals from multiple async workers is tricky if they report out of sync.
          // Better if worker reports DELTA or we track per-worker totals.
          // Let's modify worker to report DELTA for easier aggregation, OR we track per-worker.
          // Tracking per-worker is safer.
          // BUT, to avoid modifying worker logic too much, let's assume payload.attempts is TOTAL for THAT worker.
          // We can't just sum them blindly every time one reports.
          // WE NEED TO MODIFY WORKER TO REPORT DELTA or handle it here.
          // Let's handle it here by storing state? No, refs are better.
          // Actually, let's just make the worker sending DELTAS. It's cleaner.
          // Wait, if I change worker to send delta, I need to update worker code first or simultaneously.
          // I'll update worker code in next step. For now, let's assume worker sends DELTA.

          totalAttemptsRef.current += payload.attempts;

          // Throttled UI updates (every ~100ms or so to avoid React render spam)
          const now = Date.now();
          if (now - lastReportTimeRef.current > 100) {
            setAttempts(totalAttemptsRef.current);
            lastReportTimeRef.current = now;

            // Log every 25,000 aggregated
            if (totalAttemptsRef.current > 0 && totalAttemptsRef.current % 25000 < payload.attempts * cores) {
              // Approximate check to log roughly every 25k without strict modulo issues on deltas
              addLog(`mining_status: ${totalAttemptsRef.current.toLocaleString()} addresses scanned...`, 'system', true);
            }
          }

        } else if (type === 'FOUND') {
          const foundPayload = payload as GenResult;
          // Stop all workers immediately
          terminateWorkers();

          setResult({
            ...foundPayload,
            attempts: totalAttemptsRef.current // Update with total attempts
          });
          setStep('result');
          addLog(`>> match_found: ${foundPayload.publicKey}`, 'success');

        } else if (type === 'ERROR') {
          terminateWorkers();
          setError(payload.message || 'halt: worker_error');
          setStep('input_char');
          addLog(`>> error: ${payload.message || 'internal_fault'}`, 'warn');
        }
      };

      worker.postMessage({ pattern, position });
      workerPoolRef.current.push(worker);
    }
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

    const pos = val as Position;
    setError(null);
    setStep('generating');

    addLog(`crat --char "${char}" --pos "${pos}"`, 'info');
    addLog(`initializing cluster_mode...`);

    // Start workers
    initWorkers(char, pos);
  };

  const handleStop = () => {
    terminateWorkers();
    setStep('input_char');
    setChar('');
    setPositionInput('');
    addLog(`process_halted: state reset`, 'warn');
  };

  const downloadKey = () => {
    if (!result) return;
    const filename = `${char}_crat.txt`;
    const content = `${bs58.encode(new Uint8Array(result.secretKey))}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep('input_char');
    setChar('');
    setPositionInput('');
    setResult(null);
    setAttempts(0);
    setLogs([]);
    setError(null);
  };

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

              {(step === 'input_char' || step === 'input_pos' || step === 'generating' || step === 'result') && (
                <div className="flex-1 flex flex-col">
                  {/* Step 1: Char Input */}
                  <div className="prompt-group flex items-center">
                    <span className="prompt">input_char&gt;</span>
                    {step === 'input_char' ? (
                      <form onSubmit={handleCharSubmit} className="inline-flex flex-1">
                        <input
                          type="text"
                          value={char}
                          onChange={(e) => setChar(e.target.value.toLowerCase())}
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

                  {/* Step 2: Position Input */}
                  {(step === 'input_pos' || step === 'generating' || step === 'result') && (
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

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-error mb-4"
                    >
                      !! {error}
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
                        <div className="text-xs text-dim mb-2 uppercase tracking-widest">public_address</div>
                        <div className="break-all font-mono text-lg">{result.publicKey}</div>
                      </div>

                      <div className="result-actions">
                        <span onClick={copyToClipboard} className="text-link">
                          {copied ? 'address_copied' : 'copy_address'}
                        </span>
                        <span onClick={downloadKey} className="text-link">
                          download_private_key
                        </span>
                        <span onClick={reset} className="text-link">
                          new_session
                        </span>
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
