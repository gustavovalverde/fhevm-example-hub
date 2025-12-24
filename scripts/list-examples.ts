import path from "node:path";
import { loadExampleRegistry } from "./example-registry";

const rootDir = path.resolve(__dirname, "..");
const registry = loadExampleRegistry(rootDir);

for (const example of registry.examples) {
  console.log(`${example.slug} - ${example.title} (${example.difficulty})`);
}
