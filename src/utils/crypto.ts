/**
 * Encryption utilities for securing private keys
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data with a password using AES-GCM
 */
export async function encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        encoder.encode(data)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data with a password using AES-GCM
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Generates a random password for encryption
 */
export function generatePassword(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}
