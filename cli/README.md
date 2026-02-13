# Crat CLI - Multi-Chain Vanity Address Generator

Generate custom vanity addresses for **Solana**, **Bitcoin**, **Bitcoin SV**, and **Ethereum** with built-in encryption and mnemonic support.

## 🚀 Installation

```bash
npm install -g crat
```

## 📋 Features

- ✅ **4 Blockchains**: Solana, Bitcoin, Bitcoin SV, Ethereum
- ✅ **AES-256-GCM Encryption**: Secure private key storage
- ✅ **Mnemonic Support**: 12-word seed phrases for Ethereum
- ✅ **Multi-threaded**: Uses all CPU cores for maximum speed
- ✅ **Built-in Decryption**: Decrypt keys directly from CLI
- ✅ **Case-Sensitive**: Optional case-sensitive matching
- ✅ **User Choice**: Save encrypted or plain text keys

## 🎯 Usage

### Generate a Vanity Address

```bash
# Basic usage (Solana, encrypted by default)
crat gen --char asti

# Ethereum with encryption
crat gen --char cafe --chain ethereum

# Bitcoin, plain text (no encryption)
crat gen --char 1337 --chain bitcoin --encrypt off

# Case-sensitive, end position
crat gen --char ASTI --pos end --case on --chain solana
```

### Decrypt Keys

```bash
crat decrypt
```

Follow the prompts to paste your encrypted data and passwords.

## 📖 Command Reference

### `crat gen`

Generate a vanity address.

**Options:**

| Option | Description | Choices | Default |
|--------|-------------|---------|---------|
| `--char <pattern>` | Pattern to search for (max 4 chars) | - | **Required** |
| `--pos <position>` | Position of pattern | `start`, `end` | `start` |
| `--case <sensitivity>` | Case sensitivity | `on`, `off` | `off` |
| `--chain <blockchain>` | Blockchain to use | `solana`, `bitcoin`, `bsv`, `ethereum` | `solana` |
| `--encrypt <mode>` | Encryption mode | `on`, `off` | `on` |

**Chain Aliases:**
- Solana: `solana`, `sol`
- Bitcoin: `bitcoin`, `btc`
- Ethereum: `ethereum`, `eth`

**Examples:**

```bash
# Solana address starting with "asti"
crat gen --char asti

# Ethereum address ending with "cafe" (case-sensitive)
crat gen --char cafe --pos end --case on --chain eth

# Bitcoin address with "1337", save as plain text
crat gen --char 1337 --chain btc --encrypt off

# BSV address starting with "moon"
crat gen --char moon --chain bsv
```

### `crat decrypt`

Decrypt encrypted private keys and mnemonics.

**Interactive prompts:**
1. Choose what to decrypt (private key, mnemonic, or both)
2. Paste encrypted data
3. Paste decryption password
4. View decrypted keys

**Example:**

```bash
$ crat decrypt

Choose what to decrypt:
1. Private Key
2. Mnemonic Seed Phrase
3. Both

Enter choice (1/2/3): 3

--- PRIVATE KEY DECRYPTION ---
Paste ENCRYPTED PRIVATE KEY: [paste here]
Paste DECRYPTION PASSWORD: [paste here]

✅ PRIVATE KEY:
   0x7d4c8a2083e1446190eef16ada09f5fc4c15499d0eb36b88a30485624ae9df7c

--- MNEMONIC SEED PHRASE DECRYPTION ---
Paste ENCRYPTED MNEMONIC PHRASE: [paste here]
Paste MNEMONIC DECRYPTION PASSWORD: [paste here]

✅ MNEMONIC SEED PHRASE (12 words):
   cat auction inmate defense point stove aspect purpose pistol moon country nephew
```

## 📄 Output File Format

### Encrypted (default)

```
Chain: ethereum
Address: 0xE507b20DeF2Da7EEBAf283B50746019eF5210def

ENCRYPTED PRIVATE KEY:
[base64 encrypted data]

DECRYPTION PASSWORD:
[random password]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENCRYPTED MNEMONIC PHRASE (SEED PHRASE):
[base64 encrypted mnemonic]

MNEMONIC DECRYPTION PASSWORD:
[random password]

⚠️  SECURITY NOTICE ⚠️
Your private key has been encrypted using AES-256-GCM encryption.

To decrypt, run:
  crat decrypt

NEVER share this file or passwords with anyone.
```

### Plain Text (`--encrypt off`)

```
Chain: ethereum
Address: 0xE507b20DeF2Da7EEBAf283B50746019eF5210def
Private Key: 0x7d4c8a2083e1446190eef16ada09f5fc4c15499d0eb36b88a30485624ae9df7c
Mnemonic: cat auction inmate defense point stove aspect purpose pistol moon country nephew

⚠️  WARNING: This file contains UNENCRYPTED private keys!
Store securely and never share with anyone.
```

## 🔐 Security

### Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Salt**: 16 bytes (random)
- **IV**: 12 bytes (random)
- **Password**: 32 bytes (random, base64 encoded)

### Best Practices

1. **Use Encryption** (`--encrypt on` is default)
2. **Store Safely**: Keep encrypted files in secure locations
3. **Backup**: Save multiple copies of encrypted files
4. **Clear Terminal**: Run `history -c` after viewing keys
5. **Never Share**: Don't share passwords or private keys

## 🌐 Web Version

For a browser-based GUI version, visit: **https://asti-chain.com**

## 📊 Supported Chains

| Chain | Address Format | Mnemonic Support | Example Pattern |
|-------|----------------|------------------|-----------------|
| Solana | Base58 | ❌ | `asti`, `moon` |
| Bitcoin | Base58 (P2PKH) | ❌ | `1337`, `btc` |
| Bitcoin SV | Base58 | ❌ | `bsv`, `coin` |
| Ethereum | Hex (0x...) | ✅ 12 words | `cafe`, `dead` |

**Character Restrictions:**
- **Solana/Bitcoin/BSV**: Base58 only (no 0, O, I, l)
- **Ethereum**: Hexadecimal only (0-9, a-f, A-F)

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/asticrat/crat.git
cd crat/cli

# Install dependencies
npm install

# Make executable
chmod +x crat.js

# Test locally
./crat.js gen --char test
```

## 📝 Version History

### v2.0.0 (Latest)
- ✅ Added Ethereum support
- ✅ Added mnemonic seed phrase support
- ✅ Added AES-256-GCM encryption
- ✅ Added built-in decryption tool
- ✅ User choice: encrypted or plain text output
- ✅ Enhanced security features

### v1.3.0
- ✅ Solana, Bitcoin, Bitcoin SV support
- ✅ Case-sensitive matching
- ✅ Multi-threaded generation

## 📄 License

MIT

## 🔗 Links

- **Web App**: https://asti-chain.com
- **GitHub**: https://github.com/asticrat/crat
- **NPM**: https://www.npmjs.com/package/crat

## ⚠️ Disclaimer

This tool generates cryptographic keys. The authors are not responsible for lost, stolen, or compromised keys. Always store your private keys securely and never share them with anyone.
