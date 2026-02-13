/**
 * Decryption Tool for Crat Encrypted Keys
 * Usage: node decrypt-tool.js
 */

const crypto = require('crypto');

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH / 8, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

/**
 * Decrypts data with a password using AES-GCM
 */
async function decrypt(encryptedData, password) {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    // Extract auth tag (last 16 bytes)
    const authTag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

// Example usage
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         CRAT DECRYPTION TOOL');
    console.log('═══════════════════════════════════════════════════════\n');

    // Example: Decrypt your mnemonic
    const encryptedMnemonic = 'dOMM1n+cZKTJEfkJGdTVips73Clh4fVpTtZM2CgefmnDXnz0fZX7WVJ7V54qn88kq6OLVUSz5a87XCMDJ4tUq1qe1J+YnVjkrKJ7ObFrCRh/hNwOoDbSk4xYJpQG6mwMiy677Qa+uz04KypMNresZNMxrSAc59UBuY++eA==';
    const mnemonicPassword = 'XRpBJBvmTJc6fDqcDxrcO6w5L9fkx+9BhXB4UU3xV2Y=';

    const encryptedPrivateKey = 'eFOmFCq0x0iVbvZyNqwWWaYLgq0vj2AXtrbqUjYFYS9kqZNk8+ILXrKoAm2dJ3idN7j1DkxA+TGkekY+dzlQ8DxQVkaKtDQnLJ322dK4gCtTF1CpwJJnH+Xkh8MJt/1zfkLxObRBZa8Wa6PRuq8=';
    const privateKeyPassword = 'ZaT+DuaAch5jfDtjaNs87N0sdPSdrGhbR61pw+GbEi8=';

    try {
        console.log('🔓 Decrypting Mnemonic Seed Phrase...\n');
        const mnemonic = await decrypt(encryptedMnemonic, mnemonicPassword);
        console.log('✅ MNEMONIC SEED PHRASE (12 words):');
        console.log('   ' + mnemonic);
        console.log('');

        console.log('🔓 Decrypting Private Key...\n');
        const privateKey = await decrypt(encryptedPrivateKey, privateKeyPassword);
        console.log('✅ PRIVATE KEY:');
        console.log('   ' + privateKey);
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  SECURITY WARNING:');
        console.log('   - Never share these with anyone');
        console.log('   - Delete this terminal output after use');
        console.log('   - Store securely in a password manager');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Decryption failed:', error.message);
    }
}

main();
