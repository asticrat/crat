#!/usr/bin/env node

/**
 * Crat CLI - Multi-Chain Vanity Address Generator
 * Supports: Solana, Bitcoin, Bitcoin SV, Ethereum
 * Features: Encryption, Mnemonic support, Decryption tool
 */

const { Keypair } = require('@solana/web3.js');
const { Command, Option } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const bs58 = require('bs58');
const readline = require('readline');
const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const tinysecp = require('tiny-secp256k1');
const bsv = require('bsv');
const ethers = require('ethers');

const ECPair = ECPairFactory(tinysecp);
bitcoin.initEccLib(tinysecp);

const VERSION = '2.0.0';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

// Encryption constants
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

// Encryption utilities
async function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH / 8, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

async function encrypt(data, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = await deriveKey(password, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, encrypted, authTag]);
    return combined.toString('base64');
}

async function decrypt(encryptedData, password) {
    const combined = Buffer.from(encryptedData, 'base64');

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    const authTag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

function generatePassword() {
    const array = crypto.randomBytes(32);
    return array.toString('base64');
}

// Worker Logic
if (cluster.isWorker) {
    process.on('message', (msg) => {
        if (msg.cmd === 'START') {
            const { pattern, isStart, caseSensitive, chain } = msg;
            const REPORT_INTERVAL = 1000;
            let attempts = 0;
            const target = caseSensitive ? pattern : pattern.toLowerCase();

            try {
                while (true) {
                    let address = '';
                    let privateKey = '';
                    let mnemonic = null;
                    let secretKeyBytes = null;

                    if (chain === 'solana') {
                        const keypair = Keypair.generate();
                        address = keypair.publicKey.toString();
                        secretKeyBytes = Array.from(keypair.secretKey);
                    } else if (chain === 'bitcoin') {
                        const keypair = ECPair.makeRandom();
                        const { address: addr } = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey });
                        if (addr) {
                            address = addr;
                            privateKey = keypair.toWIF();
                        }
                    } else if (chain === 'bsv') {
                        const privKey = bsv.PrivKey.fromRandom();
                        const pubKey = bsv.PubKey.fromPrivKey(privKey);
                        const addr = bsv.Address.fromPubKey(pubKey);
                        address = addr.toString();
                        privateKey = privKey.toWif().toString();
                    } else if (chain === 'ethereum') {
                        const wallet = ethers.Wallet.createRandom();
                        address = wallet.address;
                        privateKey = wallet.privateKey;
                        mnemonic = wallet.mnemonic?.phrase || null;
                    }

                    if (!address) continue;

                    const checkStr = caseSensitive ? address : address.toLowerCase();
                    let isMatch = false;

                    if (isStart) {
                        isMatch = checkStr.startsWith(target);
                    } else {
                        isMatch = checkStr.endsWith(target);
                    }

                    if (isMatch) {
                        process.send?.({
                            type: 'FOUND',
                            payload: {
                                address,
                                privateKey: chain === 'solana' ? null : privateKey,
                                secretKey: chain === 'solana' ? secretKeyBytes : null,
                                mnemonic,
                                chain
                            }
                        });
                        break;
                    }

                    attempts++;
                    if (attempts >= REPORT_INTERVAL) {
                        process.send?.({
                            type: 'STATUS',
                            payload: { attempts }
                        });
                        attempts = 0;
                    }
                }
            } catch (err) {
                // Silent fail in worker
            }
        } else if (msg.cmd === 'EXIT') {
            process.exit(0);
        }
    });
} else {
    // Master Logic
    const program = new Command();

    program
        .name('crat')
        .version(VERSION, '-v, --version')
        .description('Multi-chain vanity address generator with encryption support');

    // Generate command
    program
        .command('gen')
        .description('Generate a vanity address')
        .addOption(new Option('--char <pattern>', 'Pattern to search for (required, max 4 chars)').makeOptionMandatory(true))
        .addOption(new Option('--pos <position>', 'Position: start or end').choices(['start', 'end']).default('start'))
        .addOption(new Option('--case <sensitivity>', 'Case sensitivity: on or off').choices(['on', 'off']).default('off'))
        .addOption(new Option('--chain <blockchain>', 'Blockchain: solana, bitcoin, bsv, ethereum')
            .choices(['solana', 'sol', 'bitcoin', 'btc', 'bsv', 'ethereum', 'eth'])
            .default('solana'))
        .addOption(new Option('--encrypt <mode>', 'Encryption mode: on or off').choices(['on', 'off']).default('on'))
        .action(async (options) => {
            const pattern = options.char;
            let chain = options.chain.toLowerCase();

            // Normalize chain
            if (chain === 'sol') chain = 'solana';
            if (chain === 'btc') chain = 'bitcoin';
            if (chain === 'eth') chain = 'ethereum';

            const isStart = options.pos === 'start';
            const caseSensitive = options.case === 'on';
            const shouldEncrypt = options.encrypt === 'on';

            // Validation
            if (pattern.length > 4) {
                console.log(chalk.red(`Error: Pattern "${pattern}" exceeds 4 characters.`));
                process.exit(1);
            }

            // Chain-specific validation
            if (chain === 'ethereum') {
                if (!HEX_PATTERN.test(pattern)) {
                    console.log(chalk.red(`Error: Ethereum addresses use hex (0-9, a-f). Invalid pattern: "${pattern}"`));
                    process.exit(1);
                }
            } else {
                const invalidChars = pattern.split('').filter(c => !BASE58_ALPHABET.includes(c));
                if (invalidChars.length > 0) {
                    console.log(chalk.red(`Error: Invalid Base58 characters: "${invalidChars.join(', ')}"`));
                    process.exit(1);
                }
            }

            // UI Output
            console.log(chalk.white(`> crat gen --char "${pattern}" --pos "${options.pos}" --case "${options.case}" --chain "${chain}" --encrypt "${options.encrypt}"`));
            console.log(chalk.cyan(`> web: https://asti-chain.com`));
            console.log(chalk.gray(`> initializing cluster_mode...`));

            const numCPUs = os.cpus().length;
            console.log(chalk.gray(`... spawning ${chalk.white.bold(numCPUs)} worker threads...`));

            // Start Mining
            let totalAttempts = 0;
            let workers = [];
            let isFound = false;

            const spinner = {
                update: () => {
                    process.stdout.write(`\r${chalk.gray(`... mining: ${chalk.white.bold(totalAttempts.toLocaleString())} addresses scanned...`)}`);
                }
            };

            spinner.update();

            for (let i = 0; i < numCPUs; i++) {
                const worker = cluster.fork();
                workers.push(worker);

                worker.on('message', async (msg) => {
                    if (isFound) return;

                    if (msg.type === 'STATUS') {
                        totalAttempts += msg.payload.attempts;
                        spinner.update();
                    } else if (msg.type === 'FOUND') {
                        isFound = true;
                        const { address, privateKey, secretKey, mnemonic, chain: foundChain } = msg.payload;

                        let finalPrivateKey = privateKey;
                        if (foundChain === 'solana' && secretKey) {
                            finalPrivateKey = bs58.encode(new Uint8Array(secretKey));
                        }

                        workers.forEach(w => w.kill());
                        console.log('\n');

                        // Save file
                        const fileName = `${pattern}_${foundChain}_crat.txt`;
                        let fileContent = '';

                        if (shouldEncrypt) {
                            // Encrypt private key
                            const password = generatePassword();
                            const encryptedKey = await encrypt(finalPrivateKey, password);

                            fileContent = `Chain: ${foundChain}
Address: ${address}

ENCRYPTED PRIVATE KEY:
${encryptedKey}

DECRYPTION PASSWORD:
${password}
`;

                            // Encrypt mnemonic if exists
                            if (mnemonic) {
                                const mnemonicPassword = generatePassword();
                                const encryptedMnemonic = await encrypt(mnemonic, mnemonicPassword);

                                fileContent += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENCRYPTED MNEMONIC PHRASE (SEED PHRASE):
${encryptedMnemonic}

MNEMONIC DECRYPTION PASSWORD:
${mnemonicPassword}
`;
                            }

                            fileContent += `
⚠️  SECURITY NOTICE ⚠️
Your private key has been encrypted using AES-256-GCM encryption.
Store this file securely. Anyone with access to this file can decrypt your private key.

To decrypt, install crat globally:
  npm install -g crat

Then run:
  crat decrypt

NEVER share this file or passwords with anyone.
Crat is not responsible for lost or stolen keys.
`;
                        } else {
                            // Plain text
                            fileContent = `Chain: ${foundChain}
Address: ${address}
Private Key: ${finalPrivateKey}
`;

                            if (mnemonic) {
                                fileContent += `Mnemonic: ${mnemonic}\n`;
                            }

                            fileContent += `
⚠️  WARNING: This file contains UNENCRYPTED private keys!
Store securely and never share with anyone.
`;
                        }

                        fs.writeFileSync(fileName, fileContent);

                        console.log(chalk.green(`>>> MATCH FOUND`));
                        console.log(chalk.white(`Address: `) + chalk.greenBright(address));
                        console.log(chalk.gray(`Saved to: ${fileName}`));
                        console.log(chalk.gray(`Encryption: ${shouldEncrypt ? 'ON' : 'OFF'}`));

                        if (!shouldEncrypt) {
                            console.log('');
                            const rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                            });

                            rl.question(chalk.white('Press ') + chalk.bold('ENTER') + chalk.white(' to reveal private key...'), () => {
                                console.log(chalk.yellow('----------------------------------------'));
                                console.log(chalk.white(`Private Key: `));
                                console.log(chalk.magenta(finalPrivateKey));
                                if (mnemonic) {
                                    console.log(chalk.white(`Mnemonic: `));
                                    console.log(chalk.magenta(mnemonic));
                                }
                                console.log(chalk.yellow('----------------------------------------'));
                                console.log(chalk.red.bold('WARNING: Never share your private key!'));
                                rl.close();
                                process.exit(0);
                            });
                        } else {
                            console.log(chalk.cyan('\nUse "crat decrypt" to reveal your keys.'));
                            process.exit(0);
                        }
                    }
                });

                worker.send({
                    cmd: 'START',
                    pattern,
                    isStart,
                    caseSensitive,
                    chain
                });
            }
        });

    // Decrypt command
    program
        .command('decrypt')
        .description('Decrypt encrypted private keys and mnemonics')
        .action(async () => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const question = (query) => new Promise(resolve => rl.question(query, resolve));

            console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
            console.log(chalk.cyan('         CRAT DECRYPTION TOOL'));
            console.log(chalk.cyan('═══════════════════════════════════════════════════════\n'));

            console.log('Choose what to decrypt:');
            console.log('1. Private Key');
            console.log('2. Mnemonic Seed Phrase');
            console.log('3. Both\n');

            const choice = await question('Enter choice (1/2/3): ');

            try {
                if (choice === '1' || choice === '3') {
                    console.log('\n--- PRIVATE KEY DECRYPTION ---');
                    const encryptedKey = await question('Paste ENCRYPTED PRIVATE KEY: ');
                    const keyPassword = await question('Paste DECRYPTION PASSWORD: ');

                    console.log('\n🔓 Decrypting...\n');
                    const privateKey = await decrypt(encryptedKey.trim(), keyPassword.trim());
                    console.log(chalk.green('✅ PRIVATE KEY:'));
                    console.log(chalk.magenta('   ' + privateKey));
                    console.log('');
                }

                if (choice === '2' || choice === '3') {
                    console.log('\n--- MNEMONIC SEED PHRASE DECRYPTION ---');
                    const encryptedMnemonic = await question('Paste ENCRYPTED MNEMONIC PHRASE: ');
                    const mnemonicPassword = await question('Paste MNEMONIC DECRYPTION PASSWORD: ');

                    console.log('\n🔓 Decrypting...\n');
                    const mnemonic = await decrypt(encryptedMnemonic.trim(), mnemonicPassword.trim());
                    console.log(chalk.green('✅ MNEMONIC SEED PHRASE (12 words):'));
                    console.log(chalk.magenta('   ' + mnemonic));
                    console.log('');
                }

                console.log(chalk.yellow('═══════════════════════════════════════════════════════'));
                console.log(chalk.red('⚠️  SECURITY WARNING:'));
                console.log(chalk.red('   - Never share these with anyone'));
                console.log(chalk.red('   - Clear your terminal: history -c'));
                console.log(chalk.red('   - Store securely in a password manager'));
                console.log(chalk.yellow('═══════════════════════════════════════════════════════\n'));

            } catch (error) {
                console.error(chalk.red('\n❌ Decryption failed:'), error.message);
                console.error(chalk.red('   Make sure you copied the data correctly\n'));
            }

            rl.close();
        });

    program.parse(process.argv);
}
