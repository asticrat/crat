# Crat - Multi-Chain Vanity Address Generator

**Crat** offers two powerful ways to generate custom (vanity) wallet addresses for **Solana**, **Bitcoin**, **Bitcoin SV**, and **Ethereum**: a high-speed **Web Interface** and a multi-threaded **CLI Tool**.

---

## 1. Web Interface (GUI)
No installation required. Generate custom addresses directly in your browser.

**Site:** [asti-chain.com](https://asti-chain.com)

**Supported Chains:**
- **Solana (SOL)** - Base58 addresses
- **Bitcoin (BTC)** - P2PKH addresses  
- **Bitcoin SV (BSV)** - BSV addresses
- **Ethereum (ETH)** - Hex addresses (0x...)

**Features:**
- **Zero-Install**: Works instantly in any modern browser.
- **Glassmorphism UI**: Beautiful, futuristic design.
- **Multi-Threaded**: Uses Web Workers to maximize browser performance.
- **Secure**: Keys are generated client-side and never leave your device.
- **AES-256 Encryption**: All private keys are encrypted immediately.
- **Export**: Download encrypted keys as a `.txt` file.

---

## 2. CLI Tool (Terminal)
For users who want to run the generator locally from the terminal instead of accessing the web version.

> **Note:** The source code for the CLI is located in the [`cli` branch](https://github.com/asticrat/crat/tree/cli) of this repository.

### Installation

**Option A: NPM (Recommended)**
```bash
npm install -g crat-cli
```

**Option B: Homebrew (Mac/Linux)**
```bash
brew tap asticrat/crat
brew install crat
```

### Usage
The CLI uses **Cluster Mode** to utilize all available CPU cores for mining.

**General Syntax:**
```bash
crat gen --char <custom_char> [--pos start|end] [--case on|off]
```

**Examples:**

1.  **Quick Start** (Defaults: Start position, Case Insensitive)
    ```bash
    crat gen --char asti
    ```

2.  **Specific Position** (End)
    ```bash
    crat gen --char cool --pos end
    ```

3.  **Maximum Specificity** (Case Sensitive)
    ```bash
    crat gen --char Cool --pos end --case on
    ```

### CLI Features
- **Cluster Mode**: Automatically spawns 10+ worker threads (depending on CPU) for 10x speed.
- **Hacker UI**: Minimalist, tech-focused log output.
- **Strict Validation**: Enforces valid options to prevent errors.
- **Auto-Save**: Automatically saves result to `(char)_crat.txt`.
- **Privacy**: Private keys are hidden by default (Press ENTER to reveal).

---

## License
ISC
