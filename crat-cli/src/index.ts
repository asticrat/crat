#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command, Option } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import bs58 from 'bs58';
import readline from 'readline';
import cluster from 'cluster';
import os from 'os';

const VERSION = '1.3.0';
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

    // Configure clean help by removing auto-generated clutter
    program
        .name('crat')
        .version(VERSION, '-v, --version', 'Output the version number')
        .helpOption('-h, --help', 'Display help for command')
        .usage('') // Clear usage line to implement custom help
        .description('') // Clear description
        .addHelpText('beforeAll', `Commands:
  crat gen --char <custom_char> [--pos start|end] [--case on|off]
      Generate a custom address.
`)
        .addHelpText('after', `
Notes:
  • --char is mandatory for every command
  • If --pos is not specified, it defaults to START
  • If --case is not specified, case sensitivity is OFF

Web Version:
  Visit https://asti-chain.com for the browser-based generator
`);

    program
        .command('gen', { isDefault: true }) // Make 'gen' default or strict? User said "crat gen ..."
        .description('') // Clear generic description
        .addOption(new Option('--char <custom_char>', 'Custom characters (required, max 4)').makeOptionMandatory(true))
        .addOption(new Option('--pos <start|end>', 'Position of custom characters (default: start)').choices(['start', 'end']).default('start'))
        .addOption(new Option('--case <on|off>', 'Case sensitivity (default: off)').choices(['on', 'off']).default('off'))
        .action(async (options) => {
            const pattern = options.char;

            // Note: commander .choices() handles validation for pos and case automatically,
            // displaying an error if invalid values are passed.

            const rawPos = options.pos;
            const rawCase = options.case;

            const isStart = rawPos === 'start';
            const caseSensitive = rawCase === 'on';

            // Validation (Manual check for length/Base58, Commander handles mandatory --char)
            if (pattern.length > 4) {
                console.log(chalk.red(`Error: Custom char "${pattern}" exceeds 4 characters.`));
                process.exit(1);
            }

            const invalidChars = pattern.split('').filter((c: string) => !BASE58_ALPHABET.includes(c));
            if (invalidChars.length > 0) {
                console.log(chalk.red(`Error: Custom char contains invalid Base58 characters: "${invalidChars.join(', ')}"`));
                process.exit(1);
            }

            // 4. UI Output (Hacker Style)
            console.log(chalk.white(`> crat --char "${pattern}" --pos "${rawPos}" --case "${rawCase}"`));
            console.log(chalk.cyan(`> web_version: https://asti-chain.com`));
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
