# fhEVM Examples

A multi-category repository of standalone fhEVM examples demonstrating privacy-preserving smart contract patterns.

## Overview

This repository is the main fhEVM examples hub. Each example is a small, focused contract + test you can run, study, and reuse. Examples are organized by category so you can pick the level and topic that fits your goal.

## Quick Start

```bash
npm install
npm run ensure-template
npm run examples
npm run create fhe-counter ./output/fhe-counter
```

## Start Here (Docs)

If you're new or want a guided path, begin with:

- [docs/start-here.md](docs/start-here.md)
- [docs/fhe-101.md](docs/fhe-101.md)
- [docs/learning-paths.md](docs/learning-paths.md)

## Categories

- **Basic**: Core FHE operations and anti-patterns.
- **Identity**: ERC7984, compliance, access control, and swaps.
- **Auctions**: Sealed-bid and Dutch auction patterns.
- **Games**: Example game logic with encrypted feedback.

## Available Examples

### Basic

| Example | Concept | Difficulty |
|---------|---------|------------|
| `fhe-counter` | Encrypted counter with `FHE.add`/`FHE.sub` | Beginner |
| `fhe-add` | Add two encrypted values | Beginner |
| `fhe-sub` | Subtract two encrypted values | Beginner |
| `fhe-eq` | Compare encrypted values with `FHE.eq` | Beginner |
| `fhe-if-then-else` | Conditional selection with `FHE.select` | Beginner |
| `encrypt-single-value` | Store a single encrypted value | Beginner |
| `encrypt-multiple-values` | Store multiple encrypted values | Beginner |
| `user-decrypt-single-value` | User decryption for one result | Beginner |
| `user-decrypt-multiple-values` | User decryption for multiple results | Beginner |
| `public-decrypt-single-value` | Public decryption flow (single value) | Intermediate |
| `public-decrypt-multiple-values` | Public decryption flow (multiple values) | Intermediate |
| `input-proofs-explained` | Input proof binding to contract + sender | Intermediate |
| `handle-lifecycle` | Reusing encrypted handles safely | Intermediate |
| `handle-generation` | Handle creation and derived handles | Intermediate |
| `anti-pattern-missing-allow-this` | Missing `FHE.allowThis` pitfall | Intermediate |
| `anti-pattern-missing-user-allow` | Missing `FHE.allow(user)` pitfall | Intermediate |
| `anti-pattern-view-on-encrypted` | View functions still return encrypted handles | Intermediate |

### Identity

| Example | Concept | Difficulty |
|---------|---------|------------|
| `encrypted-age-verification` | `FHE.le()` for threshold without revealing age | Beginner |
| `erc7984` | Minimal ERC7984 confidential token example | Beginner |
| `identity-registry` | Encrypted identity registry with access-gated getters | Intermediate |
| `access-control-grants` | User-controlled `FHE.allow()` permissions | Intermediate |
| `compliance-rules` | Encrypted compliance aggregation + caching | Intermediate |
| `compliant-erc20` | `FHE.select()` for branch-free compliance | Advanced |
| `transient-access-control` | `FHE.allowTransient()` for cross-contract permissions | Intermediate |
| `erc7984-kyc-restricted` | OpenZeppelin `ERC7984Restricted` allowlist (public KYC, revert-based) | Intermediate |
| `erc7984-observer-access` | Opt-in observer/audit access (Travel Rule-style) | Intermediate |
| `erc7984-erc20-wrapper` | ERC20 ↔ ERC7984 wrapping + public decryption finalization (KYC-gated) | Advanced |
| `swap-erc7984-to-erc20` | Confidential → public swap via public decrypt + `FHE.checkSignatures` | Advanced |
| `swap-erc7984-to-erc7984` | Confidential → confidential swap with `FHE.allowTransient()` | Intermediate |
| `vesting-wallet-confidential` | Confidential vesting wallet + public KYC gating + factory/clones | Advanced |

### Auctions

| Example | Concept | Difficulty |
|---------|---------|------------|
| `blind-auction` | Sealed-bid auction with encrypted bids + public reveal | Advanced |
| `dutch-auction` | Descending price auction with encrypted reserve | Intermediate |

### Games

| Example | Concept | Difficulty |
|---------|---------|------------|
| `fhe-wordle` | Encrypted letter comparison with branch-free feedback | Intermediate |

## OpenZeppelin Confidential Contracts

Several examples use OpenZeppelin Confidential Contracts (`@openzeppelin/confidential-contracts@0.3.0`) to demonstrate ERC7984-based identity/compliance flows (public KYC allowlists, observers, ERC20 wrapping, swaps, and confidential vesting).

## Common Commands (at a glance)

```text
fhEVM Example Hub

Common commands
  npm run quickstart                     # build + test one example (default: fhe-counter)
  npm run create <slug> <output-dir>     # generate a standalone example repo
  npm run create:category <cat> <dir>    # generate a category bundle
  npm run examples                       # list example slugs
  npm run categories                     # list categories
  npm run docs                           # regenerate all docs
  npm run docs:one -- <slug>             # regenerate docs for one example
  npm run catalog                        # generate docs/catalog.json
  npm run validate:all                   # generate + test all examples
  npm run validate:scratch               # full setup + verify + docs + smoke checks
  npm run clean:generated                # remove generated outputs
  npm run verify                         # lint + typecheck + compile + test
  npm run check                          # lint + typecheck + compile (no tests)
  npm run fix                            # autofix formatting + lint
  npm run help                           # show command help
```

## Template Setup (if needed)

The generators scaffold from a Hardhat template directory. If you cloned this repo without the template (e.g. ZIP download or missing submodules), run:

```bash
npm run ensure-template
```

If you are cloning with git, prefer:

```bash
git clone --recurse-submodules <repo-url>
```

## Project Structure

```
fhevm-example-hub/
├── base-template/                    # Hardhat template (git submodule of fhevm-hardhat-template)
├── contracts/
│   ├── basic/                        # Core FHE operations
│   ├── identity/                     # Identity and compliance patterns
│   ├── auctions/                     # Auction patterns (BlindAuction, DutchAuction)
│   └── games/                        # Game examples (FHEWordle)
├── test/
│   └── <category>/                   # Matching tests by category
├── docs/
│   ├── README.md                     # Documentation index
│   ├── SUMMARY.md                    # GitBook summary
│   └── <category>/                   # Generated documentation by category
├── scripts/
│   ├── create-fhevm-example.ts       # Standalone repo generator
│   ├── create-fhevm-category.ts      # Category bundle generator
│   └── generate-summary.ts           # GitBook summary generator
└── output/                           # Generated standalone examples
```

## Generated Outputs

- `docs/reference/`, `docs/<category>/`, `docs/SUMMARY.md`, and `docs/catalog.json` are generated and committed for publishing.
- `docs/start-here.md`, `docs/fhe-101.md`, and `docs/learning-paths.md` are curated source docs.
- `output/` contains generated standalone repos and stays in `.gitignore`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new examples, update dependencies, and validate generated standalone repos.

## Key Concepts Demonstrated

### 1. Encrypted Storage
```solidity
mapping(address => euint8) private birthYearOffsets;
birthYearOffsets[user] = FHE.fromExternal(encBirthYearOffset, inputProof);
```

### 2. Permission Management
```solidity
// Contract permission (required for operations)
FHE.allowThis(encryptedValue);

// User permission (required for decryption)
FHE.allow(encryptedValue, msg.sender);

// Transient permission (cross-contract, current tx only)
FHE.allowTransient(encryptedValue, otherContract);

// Public decryption (opt-in attestation)
FHE.makePubliclyDecryptable(encryptedValue);
```

### 3. Encrypted Comparisons
```solidity
// Returns encrypted boolean
ebool isOver18 = FHE.le(birthYear, maxBirthYear);
```

### 4. Branch-Free Compliance
```solidity
// No reverts on encrypted conditions - privacy preserved
euint64 actualAmount = FHE.select(isCompliant, amount, FHE.asEuint64(0));
```

## Test Results

Run `npm run test:mocked` to execute the full suite (includes positive paths and common pitfalls).

## License

MIT

## Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
