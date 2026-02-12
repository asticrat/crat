/* eslint-disable @typescript-eslint/no-explicit-any */
import { Keypair } from '@solana/web3.js';
// @ts-expect-error tinysecp declaration
import * as tinysecp from 'tiny-secp256k1';

let bitcoin: any;
let ECPairFactory: any;
let bsv: any;
let ECPair: any;
let isInitialized = false;

// Initialize libraries asynchronously
async function initLibs(chain: string) {
    if (isInitialized) return;

    if (chain === 'bitcoin') {
        try {
            bitcoin = await import('bitcoinjs-lib');
            const ecpairModule = await import('ecpair');
            ECPairFactory = ecpairModule.ECPairFactory;

            // tinysecp is imported statically to ensure WASM is loaded if possible
            // but we might need to wait for it if it's async in some environments.
            // Assuming tinysecp is ready or throws.

            bitcoin.initEccLib(tinysecp);
            ECPair = ECPairFactory(tinysecp);
        } catch (e) {
            console.error(e);
            throw new Error(`Failed to load Bitcoin libraries: ${e}`);
        }
    } else if (chain === 'bsv') {
        try {
            // @ts-expect-error bsv lacks types
            const bsvModule = await import('bsv');
            bsv = bsvModule.default || bsvModule;
        } catch (e) {
            console.error(e);
            throw new Error(`Failed to load Bitcoin SV library: ${e}`);
        }
    }
    isInitialized = true;
}

self.onmessage = async (e: MessageEvent) => {
    const { pattern, position, chain = 'solana' } = e.data;

    // Pattern validation
    if (!pattern) return;

    try {
        await initLibs(chain);
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', message: err.message || String(err) });
        return;
    }

    const target = pattern;
    const checkStart = position === 'start';

    let attempts = 0;
    const REPORT_INTERVAL = 1000;

    const startTime = Date.now();

    try {
        while (true) {
            let pubKey = '';
            let secretKey: number[] | string | null = null;

            if (chain === 'solana') {
                const keypair = Keypair.generate();
                pubKey = keypair.publicKey.toString();
                secretKey = Array.from(keypair.secretKey);
            } else if (chain === 'bitcoin') {
                if (!ECPair) throw new Error('Bitcoin lib not initialized');
                const keypair = ECPair.makeRandom();
                const { address } = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey });
                if (address) {
                    pubKey = address;
                    secretKey = keypair.toWIF();
                }
            } else if (chain === 'bsv') {
                if (!bsv) throw new Error('BSV lib not initialized');
                const privKey = bsv.PrivKey.fromRandom();
                const pub = bsv.PubKey.fromPrivKey(privKey);
                const addr = bsv.Address.fromPubKey(pub);
                pubKey = addr.toString();
                secretKey = privKey.toWif().toString();
            }

            if (!pubKey) continue;

            const checkAddr = pubKey.toLowerCase();

            let isMatch = false;

            if (checkStart) {
                isMatch = checkAddr.startsWith(target);
            } else {
                isMatch = checkAddr.endsWith(target);
            }

            if (isMatch) {
                const duration = (Date.now() - startTime) / 1000;
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
        self.postMessage({ type: 'ERROR', message: err.message || String(err) });
    }
};
