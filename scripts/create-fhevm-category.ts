/**
 * @title Create fhEVM Category
 * @description Generates a complete category with all examples and documentation
 *
 * Usage: npm run create:category <category-name> [output-directory]
 *
 * This script:
 * 1. Creates a category directory with all related examples
 * 2. Generates category-level documentation
 * 3. Creates a SUMMARY.md for GitBook integration
 * 4. Sets up Biome, Solhint, Husky, and VS Code configs for each example
 *
 * Note: Each example is scaffolded from a local Hardhat template directory
 * (typically `base-template/` as a git submodule of `zama-ai/fhevm-hardhat-template`)
 * and then customized.
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

function generateExampleReadme(example: ExampleMeta): string {
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

function generateCategoryReadme(categoryName: string, examples: ExampleMeta[]): string {
  const examplesList = examples
    .map((ex) => `| [${ex.title}](./${ex.slug}/README.md) | ${ex.concept} | ${ex.difficulty} |`)
    .join("\n");

  return `# ${categoryName}

Privacy-preserving examples for the **${categoryName}** category.

## Examples in this Category

| Example | Concept | Difficulty |
|---------|---------|------------|
${examplesList}

## Getting Started

Each example is self-contained and can be run independently:

\`\`\`bash
cd <example-name>
npm install
npm run compile
npm run test:mocked
\`\`\`

## Learn More

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
`;
}

function generateSummary(categoryName: string, examples: ExampleMeta[]): string {
  const exampleLinks = examples
    .map((ex) => `  * [${ex.title}](${categoryName}/${ex.slug}/README.md)`)
    .join("\n");

  return `# Summary

* [Introduction](README.md)
* [${categoryName}](${categoryName}/README.md)
${exampleLinks}
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
}

async function main() {
  const args = process.argv.slice(2);
  const rootDir = path.resolve(__dirname, "..");
  const registry = loadExampleRegistry(rootDir);

  if (args.length < 1) {
    console.log("Usage: npm run create:category <category-name> [output-directory]");
    console.log("\nAvailable categories:");
    for (const category of registry.categories.keys()) {
      console.log(`  ${category}`);
    }
    process.exit(1);
  }

  const categoryName = args[0];
  const outputDir = args[1] || `./output/category-${categoryName}`;

  const examples = registry.categories.get(categoryName);
  if (!examples) {
    console.error(`Unknown category: ${categoryName}`);
    console.log("Available categories:", Array.from(registry.categories.keys()).join(", "));
    process.exit(1);
  }

  console.log(`Creating category: ${categoryName}`);
  console.log(`Output directory: ${outputDir}`);

  assertEmptyDirectory(outputDir);

  // Scaffold top-level structure
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, categoryName), { recursive: true });

  const categoryDir = path.join(outputDir, categoryName);

  // Generate category README + SUMMARY.md
  fs.writeFileSync(
    path.join(categoryDir, "README.md"),
    generateCategoryReadme(categoryName, examples),
  );
  fs.writeFileSync(path.join(outputDir, "SUMMARY.md"), generateSummary(categoryName, examples));

  const rootVersions = getRootPackageVersions(rootDir);

  // Create each example subdirectory with full DX setup
  for (const example of examples) {
    const exampleDir = path.join(categoryDir, example.slug);

    // Scaffold from shared base template first.
    fs.mkdirSync(exampleDir, { recursive: true });
    copyBaseTemplate(rootDir, exampleDir);

    fs.mkdirSync(path.join(exampleDir, "contracts"), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, "test"), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, ".vscode"), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, ".husky"), { recursive: true });

    // Copy main contract
    copyFileToDir(example.contractFile, path.join(exampleDir, "contracts"));

    // Copy extra contract dependencies
    for (const extra of example.extraContractFiles) {
      if (path.basename(extra) === path.basename(example.contractFile)) {
        continue;
      }
      copyFileToDir(extra, path.join(exampleDir, "contracts"));
    }

    // Copy helper contracts (if any)
    if (example.helperFiles.length > 0) {
      const helpersDir = path.join(exampleDir, "contracts", "helpers");
      fs.mkdirSync(helpersDir, { recursive: true });
      for (const helper of example.helperFiles) {
        copyFileToDir(helper, helpersDir);
      }
    }

    // Copy mock contracts (if any)
    if (example.mockFiles.length > 0) {
      const mocksDir = path.join(exampleDir, "contracts", "mocks");
      fs.mkdirSync(mocksDir, { recursive: true });
      for (const mock of example.mockFiles) {
        copyFileToDir(mock, mocksDir);
      }
    }

    // Copy test if exists
    if (example.testFile) {
      copyFileToDir(example.testFile, path.join(exampleDir, "test"));
    }

    // Generate core files
    fs.writeFileSync(
      path.join(exampleDir, "package.json"),
      generatePackageJson(example, rootVersions),
    );
    fs.writeFileSync(path.join(exampleDir, "hardhat.config.ts"), generateHardhatConfig());
    fs.writeFileSync(path.join(exampleDir, "tsconfig.json"), generateTsConfig());
    fs.writeFileSync(path.join(exampleDir, ".gitignore"), generateGitignore());
    fs.writeFileSync(path.join(exampleDir, "README.md"), generateExampleReadme(example));

    fs.writeFileSync(
      path.join(exampleDir, "scripts", "deploy.ts"),
      generateDeployScriptForExample(example.slug, {
        contract: path.basename(example.contractFile),
        deployPlan: example.deployPlan,
      }),
    );

    // Generate DX configs
    fs.writeFileSync(path.join(exampleDir, "biome.json"), generateBiomeJson());
    fs.writeFileSync(path.join(exampleDir, ".solhint.json"), generateSolhintJson());
    fs.writeFileSync(path.join(exampleDir, ".solhintignore"), generateSolhintIgnore());
    fs.writeFileSync(path.join(exampleDir, "commitlint.config.js"), generateCommitlintConfig());
    fs.writeFileSync(path.join(exampleDir, "lint-staged.config.js"), generateLintStagedConfig());

    // VS Code configs
    fs.writeFileSync(path.join(exampleDir, ".vscode", "settings.json"), generateVSCodeSettings());
    fs.writeFileSync(
      path.join(exampleDir, ".vscode", "extensions.json"),
      generateVSCodeExtensions(),
    );

    // Husky hooks
    const preCommitPath = path.join(exampleDir, ".husky", "pre-commit");
    const commitMsgPath = path.join(exampleDir, ".husky", "commit-msg");
    const prePushPath = path.join(exampleDir, ".husky", "pre-push");

    fs.writeFileSync(preCommitPath, generateHuskyPreCommit());
    fs.writeFileSync(commitMsgPath, generateHuskyCommitMsg());
    fs.writeFileSync(prePushPath, generateHuskyPrePush());

    fs.chmodSync(preCommitPath, 0o755);
    fs.chmodSync(commitMsgPath, 0o755);
    fs.chmodSync(prePushPath, 0o755);
  }

  console.log("\nCategory bundle created successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
