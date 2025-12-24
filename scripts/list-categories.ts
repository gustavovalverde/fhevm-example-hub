import path from "node:path";
import { loadExampleRegistry } from "./example-registry";

const rootDir = path.resolve(__dirname, "..");
const registry = loadExampleRegistry(rootDir);

for (const category of registry.categories.keys()) {
  console.log(category);
}
