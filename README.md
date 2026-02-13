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
High-performance command-line tool with encryption support and multi-chain compatibility.

### Installation

```bash
npm install -g crat
```

### Features
- **4 Blockchains**: Solana, Bitcoin, BSV, Ethereum
- **AES-256 Encryption**: Secure key storage (optional)
- **Mnemonic Support**: 12-word seed phrases for Ethereum
- **Built-in Decryption**: Decrypt keys with `crat decrypt`
- **Multi-Threaded**: Uses all CPU cores
- **User Choice**: Save encrypted or plain text keys

### Quick Start

```bash
# Generate Ethereum vanity address (encrypted)
crat gen --char cafe --chain ethereum

# Generate Solana address (plain text)
crat gen --char asti --encrypt off

# Decrypt saved keys
crat decrypt
```

### Usage

```bash
# Basic syntax
crat gen --char <pattern> [options]

# Options:
#   --char <pattern>      Pattern to search for (required, max 4 chars)
#   --pos <start|end>     Position (default: start)
#   --case <on|off>       Case sensitivity (default: off)
#   --chain <blockchain>  solana|bitcoin|bsv|ethereum (default: solana)
#   --encrypt <on|off>    Encryption mode (default: on)

# Examples:
crat gen --char asti                           # Solana, encrypted
crat gen --char cafe --chain eth               # Ethereum, encrypted
crat gen --char 1337 --chain btc --encrypt off # Bitcoin, plain text
crat gen --char moon --pos end --case on       # Case-sensitive, end position
```

### Decryption

```bash
crat decrypt
```

Follow the interactive prompts to decrypt your saved keys.

**Full CLI documentation**: See [`cli/README.md`](cli/README.md)

---

## 🔐 Security Features

Both web and CLI versions include:
- **AES-256-GCM Encryption**: Military-grade encryption
- **Client-Side Generation**: Keys never leave your device
- **Anti-Inspection**: Protection against DevTools and network sniffing
- **Dual Encryption**: Separate passwords for private key and mnemonic
- **No Logging**: Private keys never logged to console

---

## 📊 Supported Chains

| Chain | Web | CLI | Address Format | Mnemonic |
|-------|-----|-----|----------------|----------|
| Solana (SOL) | ✅ | ✅ | Base58 | ❌ |
| Bitcoin (BTC) | ✅ | ✅ | Base58 (P2PKH) | ❌ |
| Bitcoin SV (BSV) | ✅ | ✅ | Base58 | ❌ |
| Ethereum (ETH) | ✅ | ✅ | Hex (0x...) | ✅ 12 words |

---

## 🚀 Development

```bash
# Clone repository
git clone https://github.com/asticrat/crat.git
cd crat

# Install dependencies
npm install

# Run web version locally
npm run dev

# Build for production
npm run build
```

---

## 📄 License

MIT

---

## ⚠️ Disclaimer

This tool generates cryptographic keys. The authors are not responsible for lost, stolen, or compromised keys. Always store your private keys securely and never share them with anyone.
