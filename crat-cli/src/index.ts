#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import bs58 from 'bs58';
import readline from 'readline';
import cluster from 'cluster';
import os from 'os';

const VERSION = '1.0.3';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// --- Worker Logic ---
if (cluster.isWorker) {
    process.on('message', (msg: any) => {
        if (msg.cmd === 'START') {
            const { pattern, isStart, caseSensitive } = msg;
            const REPORT_INTERVAL = 5000;
            let attempts = 0;

            const target = caseSensitive ? pattern : pattern.toLowerCase();

            try {
                while (true) {
                    const keypair = Keypair.generate();
                    const pubKey = keypair.publicKey.toString();

                    const checkStr = caseSensitive ? pubKey : pubKey.toLowerCase();
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
                                pubKey,
                                secretKey: Array.from(keypair.secretKey)
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
                // Silent fail in worker, master handles timeouts/errors
            }
        } else if (msg.cmd === 'EXIT') {
            process.exit(0);
        }
    });

} else {
    // --- Master Logic ---
    const program = new Command();

    program
        .name('crat')
        .description('Solana Vanity Address Generator CLI')
        .version(VERSION);

    program
        .command('gen')
        .alias('generate')
        .description('Generate a vanity address')
        .argument('[pattern]', 'The pattern to search for') // Optional positional
        .option('--char <pattern>', 'The pattern to search for (Alternative to positional)')
        .option('--pos <position>', 'Position: "start" or "end"', 'start')
        .option('--casey', 'Case Sensitive search')
        .option('--casen', 'Case Insensitive search') // No default value here, logic handles it
        .action(async (posPattern, options) => {
            // 1. Resolve Arguments
            let pattern = posPattern || options.char;

            if (!pattern) {
                console.error(chalk.red('Error: Missing pattern. Provide it as an argument or use --char.'));
                console.log('e.g., crat gen asti');
                process.exit(1);
            }

            // 2. Resolve Flags
            const rawPos = options.pos.toLowerCase();
            const isStart = rawPos === 'start';

            // Default: Case Insensitive (casen) is TRUE unless casey is explicit
            // casey flag overrides default
            const caseSensitive = options.casey === true;
            const modeName = caseSensitive ? 'Case Sensitive' : 'Case Insensitive';

            const posName = isStart ? 'start' : 'end';

            // 3. Validation
            if (pattern.length > 4) {
                console.log(chalk.red(`Error: Pattern "${pattern}" exceeds 4 characters.`));
                console.log(chalk.yellow(`Limit is 4 characters for performance reasons.`));
                process.exit(1);
            }

            const invalidChars = pattern.split('').filter((c: string) => !BASE58_ALPHABET.includes(c));
            if (invalidChars.length > 0) {
                // Even validation is strict on input chars always
                console.log(chalk.red(`Error: Pattern contains invalid Base58 characters: "${invalidChars.join(', ')}"`));
                console.log(chalk.yellow(`Base58 Note: 0, O, I, l are invalid characters.`));
                process.exit(1);
            }

            // 4. UI Output (Hacker Style)
            console.log(chalk.gray(`> crat --char "${pattern}" --pos "${posName}"`));
            console.log(chalk.gray(`> initializing cluster_mode...`));

            const numCPUs = os.cpus().length;
            console.log(chalk.gray(`... system: spawning ${chalk.white.bold(numCPUs)} worker threads...`));

            // 5. Start Mining
            let totalAttempts = 0;
            let workers: any[] = [];
            let isFound = false;

            // Status Update Loop
            const spinner = {
                text: '',
                update: () => {
                    process.stdout.write(`\r${chalk.gray(`... mining_status: ${chalk.white.bold(totalAttempts.toLocaleString())} addresses scanned...`)}`);
                }
            };

            // Initial render
            spinner.update();

            const startTime = Date.now();

            for (let i = 0; i < numCPUs; i++) {
                const worker = cluster.fork();
                workers.push(worker);

                worker.on('message', (msg: any) => {
                    if (isFound) return;

                    if (msg.type === 'STATUS') {
                        totalAttempts += msg.payload.attempts;
                        spinner.update();
                    } else if (msg.type === 'FOUND') {
                        isFound = true;
                        const { pubKey, secretKey } = msg.payload;
                        const secretKeyUint8 = new Uint8Array(secretKey);
                        const secretKeyBase58 = bs58.encode(secretKeyUint8);

                        // Kill all workers
                        workers.forEach(w => w.kill());

                        console.log('\n'); // Newline after progress

                        // Auto-Save
                        const fileName = `${pattern}_crat.txt`;
                        const fileContent = `Address: ${pubKey}\nPrivate Key: ${secretKeyBase58}`;
                        fs.writeFileSync(fileName, fileContent);

                        console.log(chalk.green(`>>> MATCH FOUND`));
                        console.log(chalk.white(`Address: `) + chalk.greenBright(pubKey));
                        console.log(chalk.gray(`Saved to: ${fileName}`));
                        console.log('');

                        // Reveal
                        const rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });

                        rl.question(chalk.white('Press ') + chalk.bold('ENTER') + chalk.white(' to reveal private key...'), () => {
                            console.log(chalk.yellow('----------------------------------------'));
                            console.log(chalk.white(`Private Key (Base58): `));
                            console.log(chalk.magenta(secretKeyBase58));
                            console.log(chalk.yellow('----------------------------------------'));
                            console.log(chalk.red.bold('WARNING: Never share your private key with anyone!'));
                            rl.close();
                            process.exit(0);
                        });
                    }
                });

                worker.send({
                    cmd: 'START',
                    pattern,
                    isStart,
                    caseSensitive
                });
            }
        });

    program.parse(process.argv);
}
