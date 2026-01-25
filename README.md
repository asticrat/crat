# Crat - Solana Vanity Address Generator

## Overview
**Crat** is a browser-based vanity address generator for the Solana blockchain. It allows users to generate custom wallet addresses (starting or ending with specific characters) directly in their browser without sending private keys over the network.

**Site:** [asti-chain.com](https://asti-chain.com)

## Architecture

### 1. Core Technology Stack
- **Framework**: React (Vite) for a fast, modern frontend.
- **Styling**: TailwindCSS (or custom CSS variables) with a "Glassmorphism" UI design.
- **Crypto Library**: `@solana/web3.js` for keypair generation.
- **Encoding**: `bs58` for Base58 encoding of private keys.

### 2. Multi-Threaded Performance
To maximize generation speed, Crat uses a **Worker Pool** architecture:
- **Main Thread**: Handles UI updates, user input, and state management. It spawns multiple Web Workers equal to the user's CPU core count (`navigator.hardwareConcurrency`).
- **Web Workers (`vanity.worker.ts`)**: Each worker runs an infinite loop generating random Ed25519 keypairs. 
- **Message Passing**: Workers report their progress (attempt counts) back to the main thread in batches to minimize message overhead. When a match is found, the successful worker sends the keypair to the main thread, and all other workers are terminated.

### 3. Security
- **Client-Side Only**: All key generation happens entirely within the user's browser. Private keys are **never** sent to any server.
- **Ephemeral State**: Keys are held in memory only for the duration of the session and cleared upon reset or page reload.
- **Safe Export**: Private keys can be downloaded as a Base58-encoded string in a `.txt` file, compatible with major Solana wallets (Phantom, Solflare).

### 4. UI/UX Design
- **Terminal Aesthetic**: The interface mimics a sleek, futuristic terminal with a glass-like transparency effect.
- **Real-Time Feedback**: Shows live "addresses scanned" counters aggregated from all worker threads.
- **Responsive**: Adapts to different screen sizes while maintaining the immersive aesthetic.

## Development

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
```

## License
Apache 2.0
