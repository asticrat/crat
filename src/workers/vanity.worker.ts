import { Keypair } from '@solana/web3.js';

self.onmessage = (e) => {
    const { pattern, position } = e.data;

    // Pattern validation
    if (!pattern) return;

    const target = pattern;
    const checkStart = position === 'start';

    let attempts = 0;
    const REPORT_INTERVAL = 1000;
    const startTime = Date.now();

    try {
        while (true) {
            const keypair = Keypair.generate();
            const pubKey = keypair.publicKey.toString();

            let isMatch = false;
            if (checkStart) {
                isMatch = pubKey.startsWith(target);
            } else {
                isMatch = pubKey.endsWith(target);
            }

            if (isMatch) {
                const duration = (Date.now() - startTime) / 1000;
                self.postMessage({
                    type: 'FOUND',
                    payload: {
                        publicKey: pubKey,
                        secretKey: Array.from(keypair.secretKey),
                        attempts,
                        duration
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
