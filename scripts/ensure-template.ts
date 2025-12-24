import * as path from "node:path";
import { ensureHardhatTemplateDir } from "./template-utils";

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const templateDir = ensureHardhatTemplateDir(rootDir);
  console.log(`Template ready: ${templateDir}`);
}

main();
