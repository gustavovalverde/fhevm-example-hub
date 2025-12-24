import path from "node:path";
import { loadExampleRegistry } from "./example-registry";

const rootDir = path.resolve(__dirname, "..");
const registry = loadExampleRegistry(rootDir);

const args = process.argv.slice(2);
const asJson = args.includes("--json");

if (asJson) {
  const payload = registry.examples.map((example) => example.slug);
  console.log(JSON.stringify(payload, null, 2));
} else {
  for (const example of registry.examples) {
    console.log(`${example.slug} - ${example.title} (${example.difficulty})`);
  }
}
