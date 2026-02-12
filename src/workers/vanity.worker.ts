import { Keypair } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
// @ts-expect-error bsv lacks types
import bsv from 'bsv';

const ECPair = ECPairFactory(tinysecp);
bitcoin.initEccLib(tinysecp);

self.onmessage = (e) => {
    const { pattern, position, chain = 'solana' } = e.data;

    // Pattern validation
    if (!pattern) return;

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
            }
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', payload: err });
    }
};
