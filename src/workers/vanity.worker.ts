import { Keypair } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
// @ts-ignore
import bsv from 'bsv';

const ECPair = ECPairFactory(tinysecp);
bitcoin.initEccLib(tinysecp);

self.onmessage = (e) => {
    const { pattern, position, chain = 'solana' } = e.data;

    // Pattern validation
    if (!pattern) return;

    const target = pattern; // Case sensitivity handled by frontend usually, but let's check
    // Worker receives exact pattern to match? App.tsx lowercases it for input but not pattern logic.
    // Actually App.tsx sets `const target = caseSensitive ? pattern : pattern.toLowerCase();` logic is missing in Worker?
    // App.tsx worker init: `worker.postMessage({ pattern, position });`
    // App.tsx input handler: `setChar(e.target.value.toLowerCase())`
    // So pattern IS lowercase unless user modifies code.
    // Let's assume pattern is already correct case.

    const checkStart = position === 'start';

    let attempts = 0;
    const REPORT_INTERVAL = 1000; // Adjusted for performance? 
    // Solana is fast, BTC/BSV slow. 
    // Worker reports delta.

    const startTime = Date.now();

    try {
        while (true) {
            let pubKey = '';
            let secretKey: any = null;

            if (chain === 'solana') {
                const keypair = Keypair.generate();
                pubKey = keypair.publicKey.toString();
                secretKey = Array.from(keypair.secretKey);
            } else if (chain === 'bitcoin') {
                const keypair = ECPair.makeRandom();
                const { address } = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey });
                if (address) {
                    pubKey = address;
                    secretKey = keypair.toWIF();
                }
            } else if (chain === 'bsv') {
                const privKey = bsv.PrivKey.fromRandom();
                const pub = bsv.PubKey.fromPrivKey(privKey);
                const addr = bsv.Address.fromPubKey(pub);
                pubKey = addr.toString();
                secretKey = privKey.toWif().toString();
            }

            if (!pubKey) continue;

            let isMatch = false;
            // Check case-insensitive? App.tsx lowercases input.
            // But addresses are case-sensitive (Base58).
            // Usually vanity generators match case-sensitively or insensitively.
            // App.tsx: `setChar(e.target.value.toLowerCase())` implies strict lowercase?
            // But Base58 has uppercase.
            // If user input is "ACE", App.tsx converts to "ace".
            // Then worker checks "ace".
            // Solana addresses have mixed case.
            // If user wants "Ace", they can't type it in App.tsx currently?
            // "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

            // Wait, App.tsx:
            // onChange={(e) => setChar(e.target.value.toLowerCase())}
            // This forces lowercase input.
            // This means we are doing Case-Insensitive matching effectively if we lowercase the address too?
            // Or only matching lowercase chars?
            // If a generated address is "Ace...", and target is "ace", 
            // `startsWith` will be false.
            // So we must lowercase address to match properly if input is forced lowercase.

            const checkAddr = pubKey.toLowerCase();
            // App.tsx passes `pattern` which is lowercased input.

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
            }
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', payload: err });
    }
};
