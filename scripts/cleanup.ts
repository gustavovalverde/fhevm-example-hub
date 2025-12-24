import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = path.resolve(__dirname, "..");

const targets = ["output", "test-output", path.join("docs", "reference")];

function removeIfExists(targetPath: string): void {
  const fullPath = path.join(rootDir, targetPath);
  if (!fs.existsSync(fullPath)) return;
  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`Removed ${targetPath}`);
}

for (const target of targets) {
  removeIfExists(target);
}
