import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..");
const contractsDir = path.join(rootDir, "contracts");

const requiredTags = [
  "@title",
  "@custom:category",
  "@custom:chapter",
  "@custom:concept",
  "@custom:difficulty",
];
const ignoreDirs = new Set(["helpers", "mocks"]);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      results.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".sol")) {
      results.push(full);
    }
  }
  return results;
}

function hasTag(content: string, tag: string): boolean {
  const pattern = new RegExp(tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  return pattern.test(content);
}

const files = walk(contractsDir);
const failures: { file: string; missing: string[] }[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const missing = requiredTags.filter((tag) => !hasTag(content, tag));
  if (missing.length > 0) {
    failures.push({ file, missing });
  }
}

if (failures.length > 0) {
  console.error("Missing required NatSpec tags:");
  for (const failure of failures) {
    const relative = path.relative(rootDir, failure.file);
    console.error(`- ${relative}: ${failure.missing.join(", ")}`);
  }
  process.exit(1);
}

console.log(`NatSpec tag validation passed for ${files.length} contract files.`);
