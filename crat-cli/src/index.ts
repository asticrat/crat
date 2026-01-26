#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import bs58 from 'bs58';
import readline from 'readline';
import cluster from 'cluster';
import os from 'os';

const VERSION = '1.1.0';
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
                // Silent fail in worker
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
        .version(VERSION, '-v, --version') // Enable -v
        .usage('gen [options] [pattern]')
        .helpOption('-h, --help', 'display help for command');

    // Remove default description to clean up help
    // program.description('') -> creates empty line, maybe avoid calling description at all

    program
        .command('gen')
        .description('Generate a vanity address')
        .argument('[pattern]', 'The pattern to search for')
        .option('--char <pattern>', 'The pattern to search for (Alternative to positional)')
        .option('-p, --pos <position>', 'Position: "start" or "end"', 'start')
        .option('-y, --casey', 'Case Sensitive search')
        .option('-n, --casen', 'Case Insensitive search')
        .action(async (posPattern, options) => {
            // 1. Resolve Pattern
            let pattern = posPattern || options.char;

            if (!pattern) {
                console.error(chalk.red('Error: Missing pattern.'));
                console.log(chalk.gray('Usage: crat gen <pattern> [options]'));
                console.log(chalk.gray('Example: crat gen asti'));
                process.exit(1);
            }

            // 2. Resolve Flags
            const rawPos = (options.pos || 'start').toLowerCase();
            const isStart = rawPos === 'start';
            const posName = isStart ? 'start' : 'end';

            // Default: Case Insensitive (casen) is the default.
            // Only be Case Sensitive if --casey (-y) is explicitly passed.
            const caseSensitive = options.casey === true;

            // 3. Validation
            if (pattern.length > 4) {
                console.log(chalk.red(`Error: Pattern "${pattern}" exceeds 4 characters.`));
                process.exit(1);
            }

            const invalidChars = pattern.split('').filter((c: string) => !BASE58_ALPHABET.includes(c));
            if (invalidChars.length > 0) {
                console.log(chalk.red(`Error: Pattern contains invalid Base58 characters: "${invalidChars.join(', ')}"`));
                process.exit(1);
            }

            // 4. UI Output (Hacker Style)
            // No extra headers, just the command log
            console.log(chalk.white(`> crat --char "${pattern}" --pos "${posName}" --case "${caseSensitive ? 'sensitive' : 'insensitive'}"`));
            console.log(chalk.gray(`> initializing cluster_mode...`));

            const numCPUs = os.cpus().length;
            console.log(chalk.gray(`... system: spawning ${chalk.white.bold(numCPUs)} worker threads...`));

            // 5. Start Mining
            let totalAttempts = 0;
            let workers: any[] = [];
            let isFound = false;

            const spinner = {
                update: () => {
                    process.stdout.write(`\r${chalk.gray(`... mining_status: ${chalk.white.bold(totalAttempts.toLocaleString())} addresses scanned...`)}`);
                }
            };

            spinner.update();

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

                        workers.forEach(w => w.kill());

                        console.log('\n'); // Newline

                        // Auto-Save
                        const fileName = `${pattern}_crat.txt`;
                        const fileContent = `Address: ${pubKey}\nPrivate Key: ${secretKeyBase58}`;
                        fs.writeFileSync(fileName, fileContent);

                        console.log(chalk.green(`>>> MATCH FOUND`));
                        console.log(chalk.white(`Address: `) + chalk.greenBright(pubKey));
                        console.log(chalk.gray(`Saved to: ${fileName}`));
                        console.log('');

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
