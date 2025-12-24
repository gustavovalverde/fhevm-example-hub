import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const showHelp = args.includes("--help") || args.includes("-h");
const forceAll = args.includes("--all");
const exampleArg = args.find((arg) => !arg.startsWith("-"));

if (showHelp) {
  console.log(`Usage:
  npm run docs
  npm run docs:one -- <example-slug>

Direct script usage:
  tsx scripts/generate-docs.ts --all
  tsx scripts/generate-docs.ts <example-slug>

Examples:
  npm run docs
  npm run docs:one -- fhe-counter
  tsx scripts/generate-docs.ts --all
  tsx scripts/generate-docs.ts fhe-counter
`);
  process.exit(0);
}

const run = (command: string, commandArgs: string[]) => {
  const result = spawnSync(command, commandArgs, { cwd: rootDir, stdio: "inherit" });
  if (result.status && result.status !== 0) {
    process.exit(result.status);
  }
};

if (forceAll || !exampleArg) {
  run("npm", ["run", "docgen"]);
  run("tsx", ["scripts/generate-gitbook.ts", "--all"]);
  run("tsx", ["scripts/generate-summary.ts"]);
  process.exit(0);
}

run("tsx", ["scripts/generate-gitbook.ts", "--example", exampleArg]);
run("tsx", ["scripts/generate-summary.ts"]);
