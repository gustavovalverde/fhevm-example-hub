/**
 * Shared generator functions for creating standalone example repositories.
 * Used by both create-fhevm-example.ts and create-fhevm-category.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExampleMeta } from "../example-registry";

// ============================================================================
// Package.json Generation
// ============================================================================

export type PackageVersions = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export function getRootPackageVersions(rootDir: string): PackageVersions {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

function resolveVersion(name: string, versions: PackageVersions): string {
  return versions.dependencies[name] ?? versions.devDependencies[name] ?? "*";
}

const BASE_DEV_DEPS = [
  "@biomejs/biome",
  "@commitlint/cli",
  "@commitlint/config-conventional",
  "@fhevm/hardhat-plugin",
  "@nomicfoundation/hardhat-chai-matchers",
  "@nomicfoundation/hardhat-ethers",
  "@nomicfoundation/hardhat-network-helpers",
  "@openzeppelin/contracts",
  "@types/node",
  "chai",
  "dotenv",
  "ethers",
  "hardhat",
  "husky",
  "lint-staged",
  "solhint",
  "typescript",
];

function buildDependencies(example: ExampleMeta, rootVersions: PackageVersions) {
  const dependencies: Record<string, string> = {};
  for (const dep of example.packageDependencies) {
    dependencies[dep] = resolveVersion(dep, rootVersions);
  }

  const devDependencies: Record<string, string> = {};
  for (const dep of BASE_DEV_DEPS) {
    if (dependencies[dep]) continue;
    devDependencies[dep] = resolveVersion(dep, rootVersions);
  }

  for (const dep of example.packageDevDependencies) {
    if (dependencies[dep]) continue;
    devDependencies[dep] = resolveVersion(dep, rootVersions);
  }

  return { dependencies, devDependencies };
}

export function generatePackageJson(example: ExampleMeta, rootVersions: PackageVersions): string {
  const { dependencies, devDependencies } = buildDependencies(example, rootVersions);

  return JSON.stringify(
    {
      name: `fhevm-example-${example.slug}`,
      version: "1.0.0",
      description: example.notice ?? example.concept,
      scripts: {
        compile: "hardhat compile",
        test: "hardhat test",
        "test:mocked": "HARDHAT_NETWORK=hardhat hardhat test",
        deploy: "hardhat run scripts/deploy.ts",
        lint: "biome check .",
        "lint:fix": "biome check . --write",
        "lint:sol": "solhint 'contracts/**/*.sol'",
        "lint:sol:fix": "solhint 'contracts/**/*.sol' --fix",
        format: "biome format . --write",
        typecheck: "tsc --noEmit",
        verify: "npm run lint && npm run lint:sol && npm run typecheck && npm run test:mocked",
        prepare: "husky",
      },
      keywords: ["fhevm", "fhe", "zama", "example", example.category],
      license: "MIT",
      dependencies,
      devDependencies,
      engines: {
        node: ">=22.0.0 <25.0.0",
      },
    },
    null,
    2,
  );
}

// ============================================================================
// Config File Generators
// ============================================================================

export function generateHardhatConfig(): string {
  return `import { HardhatUserConfig } from "hardhat/config";
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const MNEMONIC =
  process.env.MNEMONIC || "test test test test test test test test test test test junk";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      // Local fhEVM mocked mode for testing
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
`;
}

export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: "./dist",
        resolveJsonModule: true,
        types: ["node"],
      },
      include: ["scripts/**/*", "hardhat.config.ts"],
      exclude: ["node_modules", "artifacts", "cache", "test/**/*"],
    },
    null,
    2,
  );
}

export function generateGitignore(): string {
  return `node_modules
artifacts
cache
dist
coverage
.env
.env.local
`;
}

// ============================================================================
// DX Config Generators
// ============================================================================

export function generateBiomeJson(): string {
  return JSON.stringify(
    {
      $schema: "https://biomejs.dev/schemas/1.8.3/schema.json",
      files: {
        ignore: ["node_modules", "artifacts", "cache", "dist", "coverage"],
      },
      formatter: {
        indentStyle: "space",
        indentWidth: 2,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
        },
      },
    },
    null,
    2,
  );
}

export function generateSolhintJson(): string {
  return JSON.stringify(
    {
      extends: "solhint:recommended",
      rules: {
        "no-empty-blocks": "off",
      },
    },
    null,
    2,
  );
}

export function generateSolhintIgnore(): string {
  return `node_modules
artifacts
cache
`;
}

export function generateCommitlintConfig(): string {
  return `module.exports = { extends: ["@commitlint/config-conventional"] };
`;
}

export function generateLintStagedConfig(): string {
  return `module.exports = {
  "*.{ts,tsx,js,jsx,json,md}": ["biome check --write"],
  "*.sol": ["solhint --fix"],
};
`;
}

// ============================================================================
// VS Code Config Generators
// ============================================================================

export function generateVSCodeSettings(): string {
  return JSON.stringify(
    {
      "editor.formatOnSave": true,
      "editor.defaultFormatter": "biomejs.biome",
    },
    null,
    2,
  );
}

export function generateVSCodeExtensions(): string {
  return JSON.stringify(
    {
      recommendations: ["biomejs.biome", "NomicFoundation.hardhat-solidity"],
    },
    null,
    2,
  );
}

// ============================================================================
// Husky Hook Generators
// ============================================================================

export function generateHuskyPreCommit(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run lint:sol
`;
}

export function generateHuskyCommitMsg(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
`;
}

export function generateHuskyPrePush(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run verify
`;
}

// ============================================================================
// README Generators
// ============================================================================

export function generateExampleReadme(example: ExampleMeta): string {
  const extraContractsList = example.extraContractFiles
    .filter((file) => path.basename(file) !== path.basename(example.contractFile))
    .map((file) => `- \`contracts/${path.basename(file)}\` - Supporting contract`)
    .join("\n");
  const extraContractsSection = extraContractsList ? `\n${extraContractsList}` : "";

  return `# ${example.title}

> **Difficulty**: ${example.difficulty}
> **Concept**: ${example.concept}

${example.notice ?? example.concept}

## Overview

This example demonstrates the **${example.concept}** pattern in fhEVM smart contracts.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Compile the contract
npm run compile

# Run tests (mocked mode)
npm run test:mocked

# Lint and format
npm run lint:fix
npm run lint:sol:fix
\`\`\`

## Key Concepts

### 1. Encrypted Types
\`\`\`solidity
euint8  - Encrypted 8-bit unsigned integer
euint16 - Encrypted 16-bit unsigned integer
euint64 - Encrypted 64-bit unsigned integer
ebool   - Encrypted boolean
\`\`\`

### 2. FHE Operations
\`\`\`solidity
FHE.add(a, b)        // Encrypted addition
FHE.sub(a, b)        // Encrypted subtraction
FHE.le(a, b)         // Less than or equal (returns ebool)
FHE.select(cond, a, b)  // Branch-free conditional
\`\`\`

### 3. Access Control
\`\`\`solidity
FHE.allowThis(value)    // Grant contract permission
FHE.allow(value, addr)  // Grant address permission
FHE.allowTransient(value, addr)  // One-transaction permission
FHE.makePubliclyDecryptable(value)  // Public decryption (opt-in)
\`\`\`

## Files

- \`contracts/${path.basename(example.contractFile)}\` - Main contract implementation
${extraContractsSection}
- \`test/${path.basename(example.testFile ?? "") || "(no test)"}\` - Test suite

## Development

This project uses:
- **npm** - Package manager
- **Biome** - TypeScript linting and formatting
- **Solhint** - Solidity linting
- **Husky** - Git hooks for quality checks
- **Commitlint** - Conventional commit messages

## Learn More

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [fhEVM Examples](https://github.com/zama-ai/fhevm)

## License

MIT
`;
}
