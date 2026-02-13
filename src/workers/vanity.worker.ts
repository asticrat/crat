/* eslint-disable @typescript-eslint/no-explicit-any */
import { Keypair } from '@solana/web3.js';

import * as tinysecp from 'tiny-secp256k1';

console.log('[WORKER] Worker file loaded successfully');

let bitcoin: any;
let ECPairFactory: any;
let bsv: any;
let ECPair: any;
const initialized = {
    bitcoin: false,
    bsv: false
};

// Initialize libraries asynchronously
async function initLibs(chain: string) {
    if (chain === 'bitcoin' && !initialized.bitcoin) {
        try {
            bitcoin = await import('bitcoinjs-lib');
            const ecpairModule = await import('ecpair');
            ECPairFactory = ecpairModule.ECPairFactory;

            // tinysecp is imported statically to ensure WASM is loaded if possible
            // but we might need to wait for it if it's async in some environments.
            // Assuming tinysecp is ready or throws.

            bitcoin.initEccLib(tinysecp);
            ECPair = ECPairFactory(tinysecp);
            initialized.bitcoin = true;
        } catch (e) {
            console.error(e);
            throw new Error(`Failed to load Bitcoin libraries: ${e}`);
        }
    } else if (chain === 'bsv' && !initialized.bsv) {
        try {
            // @ts-expect-error bsv lacks types
            const bsvModule = await import('bsv');
            bsv = bsvModule.default || bsvModule;
            initialized.bsv = true;
        } catch (e) {
            console.error(e);
            throw new Error(`Failed to load Bitcoin SV library: ${e}`);
        }
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { pattern, position, chain = 'solana', caseSensitive = false } = e.data;

    console.log('[WORKER] Received message:', { pattern, position, chain, caseSensitive });

    // Pattern validation
    if (!pattern) {
        console.log('[WORKER] No pattern provided, ignoring message');
        return;
    }

    try {
        await initLibs(chain);
        console.log('[WORKER] Libraries initialized for:', chain);
    } catch (err: any) {
        console.error('[WORKER] Init error:', err);
        self.postMessage({ type: 'ERROR', payload: { message: err.message || String(err) } });
        return;
    }

    const target = pattern;
    const checkStart = position === 'start';

    let attempts = 0;
    const REPORT_INTERVAL = 100; // Report every 100 attempts for faster UI feedback

    const startTime = Date.now();

    console.log('[WORKER] Starting generation loop for chain:', chain);

    try {
        while (true) {
            let pubKey = '';
            let secretKey: number[] | string | null = null;

            if (chain === 'solana') {
                const keypair = Keypair.generate();
                pubKey = keypair.publicKey.toString();
                secretKey = Array.from(keypair.secretKey);
            } else if (chain === 'bitcoin') {
                if (!ECPair) {
                    self.postMessage({ type: 'ERROR', payload: { message: 'Bitcoin lib not initialized' } });
                    break;
                }
                const keypair = ECPair.makeRandom();
                const { address } = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey });
                if (address) {
                    pubKey = address;
                    secretKey = keypair.toWIF();
                }
            } else if (chain === 'bsv') {
                if (!bsv) {
                    self.postMessage({ type: 'ERROR', payload: { message: 'BSV lib not initialized' } });
                    break;
                }
                const privKey = bsv.PrivKey.fromRandom();
                const pub = bsv.PubKey.fromPrivKey(privKey);
                const addr = bsv.Address.fromPubKey(pub);
                pubKey = addr.toString();
                secretKey = privKey.toWif().toString();
            }

            if (!pubKey) continue;

            // Perform case-sensitive or case-insensitive matching based on the flag
            const checkAddr = caseSensitive ? pubKey : pubKey.toLowerCase();
            const targetToMatch = caseSensitive ? target : target.toLowerCase();

            let isMatch = false;

            if (checkStart) {
                isMatch = checkAddr.startsWith(targetToMatch);
            } else {
                isMatch = checkAddr.endsWith(targetToMatch);
            }

            if (isMatch) {
                const duration = (Date.now() - startTime) / 1000;
                // SECURITY: Only log public key, never private key
                console.log('[WORKER] Match found!', { publicKey: pubKey, attempts });
                self.postMessage({
                    type: 'FOUND',
                    payload: {
                        publicKey: pubKey,
                        secretKey,
                        attempts,
                        duration,
                        chain
                    }
                });
                break;
            }

            attempts++;
            if (attempts >= REPORT_INTERVAL) {
                // Report delta
                console.log('[WORKER] Reporting status:', attempts);
                self.postMessage({
                    type: 'STATUS',
                    payload: { attempts }
                });
                attempts = 0;

                // Allow event loop to breathe for message processing (e.g. terminate)
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', payload: { message: err.message || String(err) } });
    }
};

// Signal that the worker is ready to receive messages
console.log('[WORKER] Sending READY signal');
self.postMessage({ type: 'READY' });
