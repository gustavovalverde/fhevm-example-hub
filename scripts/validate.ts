import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadExampleRegistry } from "./example-registry";
import { ensureHardhatTemplateDir } from "./template-utils";

type RunOptions = {
  cwd: string;
  env?: NodeJS.ProcessEnv;
};

function run(command: string, args: string[], opts: RunOptions): void {
  const pretty = `$ ${command} ${args.join(" ")}`.trimEnd();
  console.log(pretty);

  const result = spawnSync(command, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env ?? {}) },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${pretty} failed with exit code ${result.status}`);
  }
}

function removeIfExists(targetPath: string): void {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const scratch = args.has("--scratch") || args.has("--from-scratch");
  const clean = scratch || args.has("--clean");
  const noDocs = args.has("--no-docs");
  const noGenerated = args.has("--no-generated");

  const examplesArgIndex = argv.indexOf("--examples");
  const examplesCsv = examplesArgIndex !== -1 ? argv[examplesArgIndex + 1] : undefined;

  const examples =
    examplesCsv && !examplesCsv.startsWith("--")
      ? examplesCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  return { scratch, clean, noDocs, noGenerated, examples };
}

function main(): void {
  const rootDir = path.resolve(__dirname, "..");
  const { scratch, clean, noDocs, noGenerated, examples } = parseArgs(process.argv.slice(2));
  const registry = loadExampleRegistry(rootDir);
  const selectedExamples = examples ?? registry.examples.slice(0, 2).map((ex) => ex.slug);

  console.log("fhEVM Examples: validate");
  console.log(`- Mode: ${scratch ? "scratch" : clean ? "clean" : "incremental"}`);
  console.log(`- Docs: ${noDocs ? "skip" : "generate"}`);
  console.log(`- Generated repos: ${noGenerated ? "skip" : "smoke-test"}`);

  // Ensure template exists (submodule init or clone fallback).
  const templateDir = ensureHardhatTemplateDir(rootDir);
  console.log(`- Template: ${templateDir}`);

  // Optional cleanup. Avoid `git clean -fdX` because it would delete ignored `.env` files too.
  if (clean) {
    console.log("Cleaning build artifacts...");
    for (const p of [
      "artifacts",
      "cache",
      "fhevmTemp",
      "typechain-types",
      path.join(".husky", "_"),
    ]) {
      removeIfExists(path.join(rootDir, p));
    }
    removeIfExists(path.join(rootDir, "test-output", "validate"));

    if (scratch) {
      removeIfExists(path.join(rootDir, "node_modules"));
    }
  }

  // Install deps if needed.
  if (scratch || !fs.existsSync(path.join(rootDir, "node_modules"))) {
    run("npm", ["install"], { cwd: rootDir });
  }

  // Core validation (lint + typecheck + compile + tests).
  run("npm", ["run", "verify"], { cwd: rootDir });

  // Docs generation (Hardhat docgen + SUMMARY.md).
  if (!noDocs) {
    run("npm", ["run", "docs"], { cwd: rootDir });
  }

  // Generator smoke test: create a couple standalone repos and run their tests.
  if (!noGenerated) {
    const validateRoot = path.join(rootDir, "test-output", "validate");
    removeIfExists(validateRoot);
    fs.mkdirSync(validateRoot, { recursive: true });

    for (const exampleName of selectedExamples) {
      const outDir = path.join(validateRoot, exampleName);
      run("npm", ["run", "create", exampleName, outDir], { cwd: rootDir });

      // Generated repos are not git repos; disable husky hooks during install.
      run("npm", ["install"], { cwd: outDir, env: { HUSKY: "0" } });
      run("npm", ["run", "test:mocked"], { cwd: outDir, env: { HUSKY: "0" } });
    }
  }

  console.log("Validation complete ✅");
}

main();
