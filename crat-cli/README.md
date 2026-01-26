# Crat CLI

Crat is a high-performance CLI tool for generating Solana vanity addresses.

## Installation

### NPM
You can install `crat-cli` directly from NPM:

```bash
npm install -g crat-cli
```

### Homebrew
If you have a custom tap set up:

```bash
brew tap yourusername/crat
brew install crat
```

## Usage

The basic command structure is `crat run <pattern>`.

### Generate a vanity address starting with specific characters:

```bash
crat run asti
```

### Generate a vanity address ending with specific characters:

```bash
crat run 777 --end
```

### Case Insensitive Search:

```bash
crat run asti --ignore-case
```

## Options

| Option | Description |
|--------|-------------|
| `-e, --end` | Search for the pattern at the end of the address. |
| `-i, --ignore-case` | Perform a case-insensitive search. |

## License
ISC
