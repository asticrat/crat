#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import bs58 from 'bs58';
import readline from 'readline';

const program = new Command();

program
    .name('crat')
    .description('Solana Vanity Address Generator CLI')
    .version('1.0.0');

program
    .command('gen')
    .alias('generate')
    .description('Generate a vanity address')
    .argument('<pattern>', 'The pattern to search for (e.g. "asti")')
    .option('-s, --start', 'Search for pattern at the start (default)')
    .option('-e, --end', 'Search for pattern at the end')
    .option('-i, --ignore-case', 'Use case-insensitive search')
    .action((pattern, options) => {
        const { start, end, ignoreCase } = options;
        const isStart = !end; // Default to start if end is not specified
        const caseSensitive = !ignoreCase;

        // Display Header
        console.log(chalk.cyan(`
      ____ ____  ____  _____ 
     / ___|  _ \\|  _ \\|   _|
    | |   | |_) | |_) | | |  
    | |___|  _ <|  _ <  | |  
     \\____|_| \\_\\|_| \\_\\ |_|  
    
    Solana Vanity Address Generator
    `));

        console.log(chalk.blue(`Target Pattern: ${chalk.bold(pattern)}`));
        console.log(chalk.blue(`Position: ${isStart ? 'Start' : 'End'}`));
        console.log(chalk.blue(`Case Sensitive: ${caseSensitive ? 'Yes' : 'No'}`));
        console.log('');

        const spinner = ora('Searching for vanity address...').start();

        const startTime = Date.now();
        let attempts = 0;
        const REPORT_INTERVAL = 10000;

        try {
            while (true) {
                const keypair = Keypair.generate();
                const pubKey = keypair.publicKey.toString();

                let isMatch = false;
                const target = caseSensitive ? pattern : pattern.toLowerCase();
                const checkStr = caseSensitive ? pubKey : pubKey.toLowerCase();

                if (isStart) {
                    isMatch = checkStr.startsWith(target);
                } else {
                    isMatch = checkStr.endsWith(target);
                }

                if (isMatch) {
                    const duration = (Date.now() - startTime) / 1000;
                    spinner.succeed(chalk.green('Address Found!'));

                    const secretKeyBase58 = bs58.encode(keypair.secretKey);

                    // Auto-Save
                    const fileName = `${pattern}_crat.txt`;
                    const fileContent = `Address: ${pubKey}\nPrivate Key: ${secretKeyBase58}`;
                    fs.writeFileSync(fileName, fileContent);

                    console.log(chalk.yellow('\n----------------------------------------'));
                    console.log(chalk.white(`Public Key: `) + chalk.greenBright(pubKey));
                    console.log(chalk.white(`Saved to: `) + chalk.cyan(fileName));
                    console.log(chalk.yellow('----------------------------------------'));
                    console.log(chalk.gray(`Attempts: ${attempts.toLocaleString()}`));
                    console.log(chalk.gray(`Duration: ${duration.toFixed(2)}s`));

                    // Reveal Mechanism
                    console.log(chalk.gray('\nPrivate Key is hidden.'));
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    rl.question(chalk.white('Press ') + chalk.bold('ENTER') + chalk.white(' to reveal private key...'), () => {
                        console.log(chalk.yellow('\n----------------------------------------'));
                        console.log(chalk.white(`Private Key (Base58): `));
                        console.log(chalk.magenta(secretKeyBase58));
                        console.log(chalk.yellow('----------------------------------------'));
                        console.log(chalk.red.bold('WARNING: Never share your private key with anyone!'));
                        rl.close();
                        process.exit(0);
                    });
                    break;
                }

                attempts++;
                if (attempts % REPORT_INTERVAL === 0) {
                    const currentDuration = (Date.now() - startTime) / 1000;
                    const speed = Math.floor(attempts / currentDuration);
                    spinner.text = `Searching... | ${attempts.toLocaleString()} attempts | ${speed.toLocaleString()} addr/s`;
                }
            }
        } catch (error) {
            spinner.fail(chalk.red('An error occurred during generation.'));
            console.error(error);
            process.exit(1);
        }
    });

program.parse(process.argv);
