# fhEVM Examples

A multi-category repository of standalone fhEVM examples demonstrating privacy-preserving smart contract patterns.

> 📖 **[View Documentation](https://sun-labs.gitbook.io/fhevm-hub/)** — Tutorials, learning paths, and full example guides

## Quick Start

```bash
npm install
npm run ensure-template
npm run examples                              # list available examples
npm run create fhe-counter ./output/my-app    # generate standalone repo
```

## Commands

```text
npm run quickstart                     # build + test one example (default: fhe-counter)
npm run create <slug> <output-dir>     # generate a standalone example repo
npm run create:category <cat> <dir>    # generate a category bundle
npm run examples                       # list example slugs
npm run categories                     # list categories
npm run docs                           # regenerate all docs
npm run validate:all                   # generate + test all examples
npm run verify                         # lint + typecheck + compile + test
npm run check                          # lint + typecheck + compile (no tests)
npm run fix                            # autofix formatting + lint
npm run help                           # show all commands
```

## Project Structure

```
fhevm-example-hub/
├── contracts/<category>/     # Example contracts by category
├── test/<category>/          # Matching tests
├── static-docs/              # Authored static pages (start-here.md, fhe-101.md)
├── docs/                     # Generated GitBook output (committed)
├── scripts/                  # Generators and utilities
├── base-template/            # Hardhat template (git submodule)
└── output/                   # Generated standalone repos (gitignored)
```

## Adding Examples

Each contract uses NatSpec custom tags for auto-discovery:

```solidity
/**
 * @title MyExample
 * @notice What this example demonstrates
 * @custom:category identity
 * @custom:difficulty beginner
 * @custom:concept One-line description
 */
contract MyExample { ... }
```

| Tag | Purpose |
|-----|---------|
| `@custom:category` | Groups examples (basic, identity, auctions, games) |
| `@custom:difficulty` | Skill level (beginner, intermediate, advanced) |
| `@custom:concept` | One-line description for tables |
| `@custom:chapter` | Topic for GitBook navigation |
| `@custom:depends-on` | Other contracts this example requires |

Run `npm run docs` to regenerate documentation after adding/modifying contracts.

## Documentation Pipeline

```bash
npm run docs          # Full pipeline: tutorial pages with inlined API
npm run docs:one      # Single example only
```

The pre-commit hook automatically regenerates docs when you commit changes to contracts.

**Generated outputs:**
- `docs/<category>/` — Tutorial pages with inlined API reference
- `docs/SUMMARY.md` — GitBook navigation (file-driven)
- `docs/reference/` — API signatures (gitignored, used for inlining)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding examples and validating generated repos.

## License

MIT

## Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/confidential)
- [Solidity NatSpec Format](https://docs.soliditylang.org/en/latest/natspec-format.html)
