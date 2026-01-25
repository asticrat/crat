export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function isValidBase58(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
        if (!BASE58_ALPHABET.includes(str[i])) {
            return false;
        }
    }
    return true;
}

export function getInvalidChars(str: string): string[] {
    const invalid = new Set<string>();
    for (let i = 0; i < str.length; i++) {
        if (!BASE58_ALPHABET.includes(str[i])) {
            invalid.add(str[i]);
        }
    }
    return Array.from(invalid);
}
