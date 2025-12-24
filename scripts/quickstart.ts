import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

const rootDir = process.cwd();
const slug = process.argv[2] ?? "fhe-counter";
const outArg = process.argv[3];
const outDir = outArg
  ? path.resolve(outArg)
  : path.join(rootDir, "test-output", "quickstart", slug);

if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
  console.error(`Output directory is not empty: ${outDir}`);
  console.error("Choose a different output directory or delete the existing one.");
  process.exit(1);
}

console.log(`Quickstart: ${slug}`);
console.log(`Output: ${outDir}`);

run("npm", ["run", "ensure-template"], rootDir);
run("npm", ["run", "create", "--", slug, outDir], rootDir);
run("npm", ["install"], outDir);
run("npm", ["run", "test:mocked"], outDir);

console.log("Quickstart complete.");
