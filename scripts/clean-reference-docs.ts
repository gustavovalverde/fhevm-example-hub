import { rm } from "node:fs/promises";
import path from "node:path";

const target = path.resolve(process.cwd(), "docs", "reference");

const run = async () => {
  await rm(target, { recursive: true, force: true });
};

run();
