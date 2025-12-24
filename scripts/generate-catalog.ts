import * as fs from "node:fs";
import * as path from "node:path";
import { loadExampleRegistry } from "./example-registry";

const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const registry = loadExampleRegistry(rootDir);

const inputFiles = new Set<string>();
for (const example of registry.examples) {
  inputFiles.add(example.contractFile);
  if (example.testFile) inputFiles.add(example.testFile);
  for (const helper of example.helperFiles) inputFiles.add(helper);
  for (const mock of example.mockFiles) inputFiles.add(mock);
  for (const extra of example.extraContractFiles) inputFiles.add(extra);
}

let latestMtime = 0;
for (const file of inputFiles) {
  try {
    const stats = fs.statSync(file);
    latestMtime = Math.max(latestMtime, stats.mtimeMs);
  } catch {
    // Ignore missing files; registry generation should surface real issues elsewhere.
  }
}

const catalog = {
  generatedAt: new Date(latestMtime || Date.now()).toISOString(),
  categories: Array.from(registry.categories.entries()).map(([name, examples]) => ({
    name,
    examples: examples.map((example) => ({
      slug: example.slug,
      title: example.title,
      concept: example.concept,
      difficulty: example.difficulty,
      docPath: `${example.category}/${example.docName}.md`,
    })),
  })),
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
console.log("Generated docs/catalog.json");
