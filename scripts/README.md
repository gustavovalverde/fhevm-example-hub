# Scripts

Automation utilities for generating standalone example repos and documentation.

## Quick Reference

```bash
npm run create <example-slug> ./output/<repo-name>
npm run create:category <category> ./output/<category-name>
npm run docs
npm run docs:one -- <example-slug>
npm run catalog
npm run examples
npm run categories
npm run validate:all
npm run clean:generated
npm run quickstart
npm run help
```

## Key Tools

### `create-fhevm-example.ts`
Generates a standalone repo for a single example.

### `create-fhevm-category.ts`
Generates a bundle of standalone repos for an entire category.

### `generate-docs.ts`
Wrapper that supports generating docs for all examples or a single example.

### `generate-catalog.ts`
Generates `docs/catalog.json` for tooling or external integrations.

### `generate-gitbook.ts`
Builds GitBook pages (contract + test tabs) from the auto-discovered registry.

### `generate-summary.ts`
Builds `docs/SUMMARY.md` and reference section indexes.

### `example-registry.ts`
Discovers examples by scanning `contracts/` and reading NatSpec tags:
- `@custom:category`, `@custom:chapter`, `@custom:concept`, `@custom:difficulty`

## Tips

- Add new examples by creating `contracts/<category>/<ContractName>.sol` plus matching tests.
- Re-run `npm run docs` after adding or modifying examples.
- Run `npm run catalog` when you want an updated `docs/catalog.json`.
- If `base-template/` is missing, run `npm run ensure-template`.
