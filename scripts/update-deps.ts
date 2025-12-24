#!/usr/bin/env tsx
/**
 * @title Update Dependencies Script
 * @description Updates @fhevm/solidity and other core dependencies across the hub and generated examples
 * @usage npx tsx scripts/update-deps.ts [--check | --apply]
 */

import * as fs from "node:fs";
import * as path from "node:path";

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "output");

// Core dependencies to track
const TRACKED_DEPS = [
  "@fhevm/solidity",
  "@openzeppelin/confidential-contracts",
  "@openzeppelin/contracts",
  "@fhevm/hardhat-plugin",
];

function readPackageJson(dir: string): PackageJson | null {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
}

function getVersion(pkg: PackageJson, dep: string): string | undefined {
  return pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
}

function findGeneratedRepos(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  return fs
    .readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(OUTPUT_DIR, d.name))
    .filter((dir) => fs.existsSync(path.join(dir, "package.json")));
}

function checkDependencies(): void {
  const rootPkg = readPackageJson(ROOT);
  if (!rootPkg) {
    console.error("Could not read root package.json");
    process.exit(1);
  }

  console.log("Hub dependency versions:");
  console.log("========================");
  for (const dep of TRACKED_DEPS) {
    const version = getVersion(rootPkg, dep);
    if (version) {
      console.log(`  ${dep}: ${version}`);
    }
  }

  const repos = findGeneratedRepos();
  if (repos.length === 0) {
    console.log("\nNo generated repos found in output/");
    return;
  }

  console.log(`\nChecking ${repos.length} generated repos...`);

  let outdated = 0;
  for (const repo of repos) {
    const pkg = readPackageJson(repo);
    if (!pkg) continue;

    const repoName = path.basename(repo);
    const issues: string[] = [];

    for (const dep of TRACKED_DEPS) {
      const hubVersion = getVersion(rootPkg, dep);
      const repoVersion = getVersion(pkg, dep);

      if (hubVersion && repoVersion && hubVersion !== repoVersion) {
        issues.push(`${dep}: ${repoVersion} → ${hubVersion}`);
      }
    }

    if (issues.length > 0) {
      outdated++;
      console.log(`\n${repoName}:`);
      for (const issue of issues) {
        console.log(`  ⚠ ${issue}`);
      }
    }
  }

  if (outdated === 0) {
    console.log("\n✓ All generated repos are up to date");
  } else {
    console.log(`\n${outdated} repo(s) have outdated dependencies`);
    console.log("Run with --apply to update, or regenerate repos with:");
    console.log("  npm run create <name> ./output/<name>");
  }
}

function applyUpdates(): void {
  const rootPkg = readPackageJson(ROOT);
  if (!rootPkg) {
    console.error("Could not read root package.json");
    process.exit(1);
  }

  const repos = findGeneratedRepos();
  if (repos.length === 0) {
    console.log("No generated repos found in output/");
    return;
  }

  console.log(`Updating ${repos.length} generated repos...`);

  for (const repo of repos) {
    const pkgPath = path.join(repo, "package.json");
    const pkg = readPackageJson(repo);
    if (!pkg) continue;

    let updated = false;

    for (const dep of TRACKED_DEPS) {
      const hubVersion = getVersion(rootPkg, dep);

      if (hubVersion && pkg.dependencies?.[dep]) {
        if (pkg.dependencies[dep] !== hubVersion) {
          pkg.dependencies[dep] = hubVersion;
          updated = true;
        }
      }
      if (hubVersion && pkg.devDependencies?.[dep]) {
        if (pkg.devDependencies[dep] !== hubVersion) {
          pkg.devDependencies[dep] = hubVersion;
          updated = true;
        }
      }
    }

    if (updated) {
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`  ✓ Updated ${path.basename(repo)}`);
    }
  }

  console.log("\nDone. Run 'npm install' in each repo to apply changes.");
}

// Main
const args = process.argv.slice(2);
const mode = args[0] || "--check";

if (mode === "--help" || mode === "-h") {
  console.log("Usage: npx tsx scripts/update-deps.ts [--check | --apply]");
  console.log("");
  console.log("Options:");
  console.log("  --check   Show dependency version mismatches (default)");
  console.log("  --apply   Update package.json in generated repos");
  process.exit(0);
}

if (mode === "--apply") {
  applyUpdates();
} else {
  checkDependencies();
}
