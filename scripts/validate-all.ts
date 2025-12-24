import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "test-output", "validate-all");

function run(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): void {
  const mergedEnv = env ? { ...process.env, ...env } : process.env;
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: mergedEnv });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function listExamples(): string[] {
  const result = spawnSync("tsx", ["scripts/list-examples.ts", "--json"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw new Error("Failed to list examples");
  }
  try {
    const parsed = JSON.parse(result.stdout ?? "[]");
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallthrough
  }
  throw new Error("Examples output is not valid JSON. Use `npm run examples -- --json`.");
}

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

const examples = listExamples();

for (const example of examples) {
  const dest = path.join(outputDir, example);
  run("npm", ["run", "create", example, dest], rootDir);
  run("npm", ["install"], dest, { HUSKY: "0" });
  run("npm", ["run", "test:mocked"], dest, { HUSKY: "0" });
}

console.log(`Validated ${examples.length} examples.`);
