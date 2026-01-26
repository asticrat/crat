#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';

const program = new Command();

program
    .name('crat')
    .description('Solana Vanity Address Generator CLI')
    .version('1.0.0');

program
    .command('run')
    .description('Generate a vanity address')
    .argument('<pattern>', 'The pattern to search for') // Positional argument for pattern
    .option('-s, --start', 'Search for pattern at the start (default)')
    .option('-e, --end', 'Search for pattern at the end')
    .option('-i, --ignore-case', 'Use case-insensitive search')
    .action((pattern, options) => {
        const { start, end, ignoreCase } = options;
        const isStart = !end; // Default to start if end is not specified
        const caseSensitive = !ignoreCase;

        console.log(chalk.cyan(`
      ____ ____  ____  _____ 
     / ___|  _ \|  _ \|_   _|
    | |   | |_) | |_) | | |  
    | |___|  _ <|  _ <  | |  
     \____|_| \_\_| \_\ |_|  
    
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
                    spinner.succeed(chalk.green('Address Found!'));
                    const duration = (Date.now() - startTime) / 1000;

                    console.log(chalk.yellow('\n----------------------------------------'));
                    console.log(chalk.white(`Public Key: `) + chalk.greenBright(pubKey));
                    console.log(chalk.white(`Private Key (Uint8Array): `) + chalk.magenta(`[${keypair.secretKey.toString()}]`));
                    console.log(chalk.yellow('----------------------------------------'));
                    console.log(chalk.gray(`Attempts: ${attempts.toLocaleString()}`));
                    console.log(chalk.gray(`Duration: ${duration.toFixed(2)}s`));
                    console.log(chalk.gray(`Speed: ${Math.floor(attempts / duration).toLocaleString()} addr/s`));

                    process.exit(0);
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
