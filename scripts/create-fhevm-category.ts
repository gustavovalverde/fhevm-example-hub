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

function removeDirIfExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
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

    // Remove template example contract/tests to avoid duplicates.
    removeDirIfExists(path.join(exampleDir, "contracts"));
    removeDirIfExists(path.join(exampleDir, "test"));

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
      generateDeployScriptForExample({
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
