# Security Policy

## Overview

Crat is a **client-side, browser-based vanity address generator for the Solana blockchain**.  
All cryptographic operations occur locally in the user’s browser. At no point are private keys transmitted, stored, or processed on any server.

Security is a core design goal of this project.

---

## Key Security Principles

### 1. Client-Side Only Key Generation
- All Solana keypairs are generated **entirely in the browser**.
- No private keys, seed phrases, or sensitive data are ever sent over the network.
- No backend services are involved in key generation.

### 2. Ephemeral Key Handling
- Generated keys exist **only in memory** during the active session.
- Keys are cleared when:
  - the user resets the generator
  - the page is refreshed
  - the browser tab is closed
- Crat does not persist keys to localStorage, IndexedDB, cookies, or any other storage.

### 3. Safe Export
- Private keys are exported **only at the user’s explicit request**.
- Exports are provided as a locally downloaded `.txt` file containing a Base58-encoded private key.
- The format is compatible with common Solana wallets such as Phantom and Solflare.

### 4. No Telemetry or Tracking of Sensitive Data
- Crat does not log, track, or collect:
  - generated addresses
  - private keys
  - search patterns
- Any analytics (if enabled) must not include cryptographic material.

---

## Web Worker Isolation

- Vanity address generation runs inside dedicated Web Workers.
- Workers do not have access to the DOM or network APIs.
- When a matching address is found:
  - the successful worker reports the result to the main thread
  - all other workers are immediately terminated

This design minimizes attack surface and improves performance without compromising security.

---

## Dependencies

Crat relies on well-established open-source libraries, including:
- `@solana/web3.js` for cryptographic keypair generation
- `bs58` for Base58 encoding

Dependencies should be kept up to date to receive upstream security fixes.

---

## Responsible Disclosure

If you discover a security vulnerability, please report it responsibly.

**Do not open public issues for security vulnerabilities.**

Instead, contact:
- GitHub: open a private security advisory, or
- Email: `asticrat@gmail.com` 

I will investigate promptly and coordinate a fix.

---

## Disclaimer

Crat is provided as-is. Users are responsible for:
- securely storing exported private keys
- understanding the risks of managing blockchain keys
- verifying builds when using self-hosted or modified versions

Always verify the site URL and repository source before generating real wallets.
