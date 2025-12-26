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
import { loadExampleRegistry } from "./example-registry";
import {
  generateBiomeJson,
  generateCommitlintConfig,
  generateExampleReadme,
  generateGitignore,
  generateHardhatConfig,
  generateHuskyCommitMsg,
  generateHuskyPreCommit,
  generateHuskyPrePush,
  generateLintStagedConfig,
  generatePackageJson,
  generateSolhintIgnore,
  generateSolhintJson,
  generateTsConfig,
  generateVSCodeExtensions,
  generateVSCodeSettings,
  getRootPackageVersions,
} from "./lib/generators";
import { ensureHardhatTemplateDir } from "./template-utils";

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

function removeDirIfExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
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

  // Remove template example contract/tests to avoid duplicates.
  removeDirIfExists(path.join(outputDir, "contracts"));
  removeDirIfExists(path.join(outputDir, "test"));

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

  fs.writeFileSync(path.join(outputDir, "README.md"), generateExampleReadme(example));
  console.log("  Generated: README.md");

  fs.writeFileSync(
    path.join(outputDir, "scripts", "deploy.ts"),
    generateDeployScriptForExample({
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
