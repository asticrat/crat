/**
 * Crat Decryption Tool - Interactive Version
 * Usage: node decrypt.cjs
 * 
 * Paste your encrypted data and password when prompted
 */

const crypto = require('crypto');
const readline = require('readline');

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH / 8, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
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

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         CRAT DECRYPTION TOOL (Interactive)');
    console.log('═══════════════════════════════════════════════════════\n');

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
            console.log('✅ PRIVATE KEY:');
            console.log('   ' + privateKey);
            console.log('');
        }

        if (choice === '2' || choice === '3') {
            console.log('\n--- MNEMONIC SEED PHRASE DECRYPTION ---');
            const encryptedMnemonic = await question('Paste ENCRYPTED MNEMONIC PHRASE: ');
            const mnemonicPassword = await question('Paste MNEMONIC DECRYPTION PASSWORD: ');

            console.log('\n🔓 Decrypting...\n');
            const mnemonic = await decrypt(encryptedMnemonic.trim(), mnemonicPassword.trim());
            console.log('✅ MNEMONIC SEED PHRASE (12 words):');
            console.log('   ' + mnemonic);
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  SECURITY WARNING:');
        console.log('   - Never share these with anyone');
        console.log('   - Clear your terminal after use: history -c');
        console.log('   - Store securely in a password manager');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Decryption failed:', error.message);
        console.error('   Make sure you copied the data correctly (no extra spaces/newlines)\n');
    }

    rl.close();
}

main();
