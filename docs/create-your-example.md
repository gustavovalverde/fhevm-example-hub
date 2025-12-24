# Create Your Own Example

This repository auto-discovers examples directly from the `contracts/` folder. You do not need to update hardcoded lists.

## Required tags (in NatSpec)

Every example contract must include:

- `@title`
- `@custom:category`
- `@custom:chapter`
- `@custom:concept`
- `@custom:difficulty`

## Optional tags

- `@custom:depends-on` (comma-separated contract names)
- `@custom:deploy-plan` (single-line JSON array)

## Create a standalone example repo

```bash
npm run create <example-slug> <output-dir>
```

The generator copies your contract + test and creates a ready-to-run Hardhat project.
