/**
 * @title Create fhEVM Example
 * @description Generates a standalone, forkable example repository from an existing contract
 *
 * Usage: npm run create <example-name> [output-directory]
 *
 * This script:
 * 1. Copies the contract and test files
 * 2. Generates a minimal hardhat.config.ts
 * 3. Creates a package.json with fhevm and DX dependencies
 * 4. Generates a README with usage instructions
 * 5. Sets up Biome, Solhint, Husky, and VS Code configs
 *
 * Note: This script uses a local Hardhat template directory (typically
 * `base-template/` as a git submodule of `zama-ai/fhevm-hardhat-template`) as the
 * scaffolding source, then applies minimal example-specific overrides.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateDeployScriptForExample } from "./deploy-script-generators";
import { type ExampleMeta, loadExampleRegistry } from "./example-registry";
import { ensureHardhatTemplateDir } from "./template-utils";

function getRootPackageVersions(rootDir: string) {
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

function resolveVersion(name: string, versions: ReturnType<typeof getRootPackageVersions>): string {
  return versions.dependencies[name] ?? versions.devDependencies[name] ?? "*";
}

function buildDependencies(
  example: ExampleMeta,
  rootVersions: ReturnType<typeof getRootPackageVersions>,
) {
  const dependencies: Record<string, string> = {};
  for (const dep of example.packageDependencies) {
    dependencies[dep] = resolveVersion(dep, rootVersions);
  }

  const baseDevDeps = [
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

  const devDependencies: Record<string, string> = {};
  for (const dep of baseDevDeps) {
    if (dependencies[dep]) continue;
    devDependencies[dep] = resolveVersion(dep, rootVersions);
  }

  for (const dep of example.packageDevDependencies) {
    if (dependencies[dep]) continue;
    devDependencies[dep] = resolveVersion(dep, rootVersions);
  }

  return { dependencies, devDependencies };
}

function generatePackageJson(
  example: ExampleMeta,
  rootVersions: ReturnType<typeof getRootPackageVersions>,
): string {
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

function generateHardhatConfig(): string {
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

function generateReadme(example: ExampleMeta): string {
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

function generateTsConfig(): string {
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

function generateGitignore(): string {
  return `node_modules
artifacts
cache
dist
coverage
.env
.env.local
`;
}

function generateBiomeJson(): string {
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

function generateSolhintJson(): string {
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

function generateSolhintIgnore(): string {
  return `node_modules
artifacts
cache
`;
}

function generateCommitlintConfig(): string {
  return `module.exports = { extends: ["@commitlint/config-conventional"] };
`;
}

function generateLintStagedConfig(): string {
  return `module.exports = {
  "*.{ts,tsx,js,jsx,json,md}": ["biome check --write"],
  "*.sol": ["solhint --fix"],
};
`;
}

function generateVSCodeSettings(): string {
  return JSON.stringify(
    {
      "editor.formatOnSave": true,
      "editor.defaultFormatter": "biomejs.biome",
    },
    null,
    2,
  );
}

function generateVSCodeExtensions(): string {
  return JSON.stringify(
    {
      recommendations: ["biomejs.biome", "NomicFoundation.hardhat-solidity"],
    },
    null,
    2,
  );
}

function generateHuskyPreCommit(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run lint:sol
`;
}

function generateHuskyCommitMsg(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
`;
}

function generateHuskyPrePush(): string {
  return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run verify
`;
}

function copyBaseTemplate(rootDir: string, outputDir: string) {
  const templateDir = ensureHardhatTemplateDir(rootDir);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Hardhat template directory not found: ${templateDir}`);
  }

  const templateContents = fs.readdirSync(templateDir);
  for (const entry of templateContents) {
    if (entry === ".git") continue;
    const srcPath = path.join(templateDir, entry);
    const destPath = path.join(outputDir, entry);

    if (fs.lstatSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function assertEmptyDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  const entries = fs.readdirSync(dirPath);
  if (entries.length > 0) {
    throw new Error(`Output directory is not empty: ${dirPath}`);
  }
}

function copyFileToDir(src: string, destDir: string) {
  if (!fs.existsSync(src)) {
    console.warn(`  Warning: File not found: ${src}`);
    return;
  }
  const destPath = path.join(destDir, path.basename(src));
  fs.copyFileSync(src, destPath);
  console.log(`  Copied: ${path.basename(src)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const rootDir = path.resolve(__dirname, "..");
  const registry = loadExampleRegistry(rootDir);

  if (args.length < 1) {
    console.log("Usage: npm run create <example-name> [output-directory]");
    console.log("\nAvailable examples:");
    for (const example of registry.examples) {
      console.log(`  ${example.slug} - ${example.title} (${example.difficulty})`);
    }
    process.exit(1);
  }

  const exampleName = args[0];
  const outputDir = args[1] || `./output/${exampleName}`;

  const example = registry.bySlug.get(exampleName);
  if (!example) {
    console.error(`Unknown example: ${exampleName}`);
    console.log("Available examples:", registry.examples.map((ex) => ex.slug).join(", "));
    process.exit(1);
  }

  console.log(`Creating example: ${exampleName}`);
  console.log(`Output directory: ${outputDir}`);

  assertEmptyDirectory(outputDir);

  // Scaffold from shared base template first.
  fs.mkdirSync(outputDir, { recursive: true });
  copyBaseTemplate(rootDir, outputDir);

  // Create output directory structure
  fs.mkdirSync(path.join(outputDir, "contracts"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, "test"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, ".vscode"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, ".husky"), { recursive: true });

  // Copy main contract
  copyFileToDir(example.contractFile, path.join(outputDir, "contracts"));

  // Copy extra contract dependencies
  for (const extra of example.extraContractFiles) {
    if (path.basename(extra) === path.basename(example.contractFile)) {
      continue;
    }
    copyFileToDir(extra, path.join(outputDir, "contracts"));
  }

  // Copy helper contracts (if any)
  if (example.helperFiles.length > 0) {
    const helpersDir = path.join(outputDir, "contracts", "helpers");
    fs.mkdirSync(helpersDir, { recursive: true });
    for (const helper of example.helperFiles) {
      copyFileToDir(helper, helpersDir);
    }
  }

  // Copy mock contracts (if any)
  if (example.mockFiles.length > 0) {
    const mocksDir = path.join(outputDir, "contracts", "mocks");
    fs.mkdirSync(mocksDir, { recursive: true });
    for (const mock of example.mockFiles) {
      copyFileToDir(mock, mocksDir);
    }
  }

  // Copy test
  if (example.testFile) {
    copyFileToDir(example.testFile, path.join(outputDir, "test"));
  } else {
    console.warn("  Warning: No test file resolved for this example.");
  }

  const rootVersions = getRootPackageVersions(rootDir);

  // Generate core files
  fs.writeFileSync(
    path.join(outputDir, "package.json"),
    generatePackageJson(example, rootVersions),
  );
  console.log("  Generated: package.json");

  fs.writeFileSync(path.join(outputDir, "hardhat.config.ts"), generateHardhatConfig());
  console.log("  Generated: hardhat.config.ts");

  fs.writeFileSync(path.join(outputDir, "tsconfig.json"), generateTsConfig());
  console.log("  Generated: tsconfig.json");

  fs.writeFileSync(path.join(outputDir, ".gitignore"), generateGitignore());
  console.log("  Generated: .gitignore");

  fs.writeFileSync(path.join(outputDir, "README.md"), generateReadme(example));
  console.log("  Generated: README.md");

  fs.writeFileSync(
    path.join(outputDir, "scripts", "deploy.ts"),
    generateDeployScriptForExample(example.slug, {
      contract: path.basename(example.contractFile),
      deployPlan: example.deployPlan,
    }),
  );
  console.log("  Generated: scripts/deploy.ts");

  // Generate DX configs
  fs.writeFileSync(path.join(outputDir, "biome.json"), generateBiomeJson());
  console.log("  Generated: biome.json");

  fs.writeFileSync(path.join(outputDir, ".solhint.json"), generateSolhintJson());
  console.log("  Generated: .solhint.json");

  fs.writeFileSync(path.join(outputDir, ".solhintignore"), generateSolhintIgnore());
  console.log("  Generated: .solhintignore");

  fs.writeFileSync(path.join(outputDir, "commitlint.config.js"), generateCommitlintConfig());
  console.log("  Generated: commitlint.config.js");

  fs.writeFileSync(path.join(outputDir, "lint-staged.config.js"), generateLintStagedConfig());
  console.log("  Generated: lint-staged.config.js");

  // VS Code configs
  fs.writeFileSync(path.join(outputDir, ".vscode", "settings.json"), generateVSCodeSettings());
  fs.writeFileSync(path.join(outputDir, ".vscode", "extensions.json"), generateVSCodeExtensions());
  console.log("  Generated: .vscode/settings.json, .vscode/extensions.json");

  // Husky hooks
  const preCommitPath = path.join(outputDir, ".husky", "pre-commit");
  const commitMsgPath = path.join(outputDir, ".husky", "commit-msg");
  const prePushPath = path.join(outputDir, ".husky", "pre-push");

  fs.writeFileSync(preCommitPath, generateHuskyPreCommit());
  fs.writeFileSync(commitMsgPath, generateHuskyCommitMsg());
  fs.writeFileSync(prePushPath, generateHuskyPrePush());

  fs.chmodSync(preCommitPath, 0o755);
  fs.chmodSync(commitMsgPath, 0o755);
  fs.chmodSync(prePushPath, 0o755);

  console.log("  Generated: .husky/pre-commit, .husky/commit-msg, .husky/pre-push");

  console.log("\nExample repository created successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
