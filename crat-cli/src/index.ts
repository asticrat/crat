#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import bs58 from 'bs58';
import readline from 'readline';

const program = new Command();
const VERSION = '1.0.2';

program
    .name('crat')
    .description('Solana Vanity Address Generator CLI')
    .version(VERSION);

program
    .command('gen')
    .alias('generate')
    .description('Generate a vanity address')
    .argument('<pattern>', 'The pattern to search for (e.g. "asti")')
    .option('-s, --start', 'Search for pattern at the start (default)')
    .option('-e, --end', 'Search for pattern at the end')
    .option('--casey', 'Case Sensitive search (default)')
    .option('--casen', 'Case Insensitive search')
    .action((pattern, options) => {
        const { start, end, casey, casen } = options;
        const isStart = !end; // Default to start if end is not specified

        // Determine case sensitivity based on flags
        // Default is Case Sensitive (casey) unless casen is explicitly provided
        const caseSensitive = casen ? false : true;

        // Base58 Validation
        const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const invalidChars = pattern.split('').filter((c: string) => !BASE58_ALPHABET.includes(c));

        // Header
        console.log(chalk.cyan(`\n--- crat-cli ${VERSION} ---\n`));

        if (invalidChars.length > 0 && caseSensitive) {
            console.log(chalk.red(`Error: Pattern contains invalid Base58 characters: "${invalidChars.join(', ')}"`));
            console.log(chalk.yellow(`Base58 Note: 0, O, I, l are invalid characters.`));
            process.exit(1);
        }

        // If case insensitive, we check validation on the pattern but acknowledge it will be lowercased for search logic
        if (invalidChars.length > 0 && !caseSensitive) {
            // Warn if insensitive search has invalid chars (though logic handles casing, Base58 strictness usually applies to the output)
            // For vanitygen, usually we let it slide if insensitive since 'o' matches 'L' etc aren't standard.
            // But strict Base58 means '0','O','I','l' don't exist period. 
            // Warn user anyway.
            console.log(chalk.yellow(`Warning: Pattern contains characters that are not in Base58. They will be ignored or matched leniently in insensitive mode.`));
        }

        console.log(chalk.blue(`Target Pattern: ${chalk.bold(pattern)}`));
        console.log(chalk.blue(`Position: ${isStart ? 'Start' : 'End'}`));
        console.log(chalk.blue(`Mode: ${caseSensitive ? 'Case Sensitive (casey)' : 'Case Insensitive (casen)'}`));
        console.log(chalk.gray(`Base58 Note: 0, O, I, l are invalid characters.`));
        console.log('');

        const spinner = ora('Mining...').start();

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
                    spinner.text = `Mining... | ${attempts.toLocaleString()} attempts | ${speed.toLocaleString()} addr/s`;
                }
            }
        } catch (error) {
            spinner.fail(chalk.red('An error occurred during mining.'));
            console.error(error);
            process.exit(1);
        }
    });

program.parse(process.argv);
