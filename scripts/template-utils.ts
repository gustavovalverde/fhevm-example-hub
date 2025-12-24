import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_TEMPLATE_GIT_URL = "https://github.com/zama-ai/fhevm-hardhat-template.git";
const DEFAULT_TEMPLATE_DIRS = ["base-template", "fhevm-hardhat-template"];

function looksLikeHardhatTemplate(dirPath: string): boolean {
  return (
    fs.existsSync(path.join(dirPath, "package.json")) &&
    fs.existsSync(path.join(dirPath, "hardhat.config.ts"))
  );
}

function listDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

function safeToReplaceDirectory(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return true;
  const entries = listDir(dirPath);
  if (entries.length === 0) return true;

  // Common uninitialized-submodule state: empty dir.
  // Common submodule state: only a `.git` file (but no working tree content yet).
  if (entries.length === 1 && entries[0] === ".git") return true;

  return false;
}

type GitSubmoduleConfig = { path: string; url?: string };

function parseGitmodules(gitmodulesContent: string): GitSubmoduleConfig[] {
  const configs: GitSubmoduleConfig[] = [];
  let current: GitSubmoduleConfig | null = null;

  for (const rawLine of gitmodulesContent.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("[submodule ")) {
      if (current?.path) configs.push(current);
      current = { path: "" };
      continue;
    }
    if (!current) continue;

    const pathMatch = line.match(/^path\s*=\s*(.+)$/);
    if (pathMatch) {
      current.path = pathMatch[1].trim();
      continue;
    }

    const urlMatch = line.match(/^url\s*=\s*(.+)$/);
    if (urlMatch) {
      current.url = urlMatch[1].trim();
    }
  }

  if (current?.path) configs.push(current);
  return configs;
}

function runCommand(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function isGitAvailable(cwd: string): boolean {
  const result = spawnSync("git", ["--version"], { cwd, stdio: "ignore" });
  return !result.error && result.status === 0;
}

function resolveTemplateCandidates(rootDir: string): string[] {
  const envTemplateDir = process.env.FHEVM_TEMPLATE_DIR;
  const candidates: string[] = [];

  if (envTemplateDir) {
    candidates.push(
      path.isAbsolute(envTemplateDir) ? envTemplateDir : path.join(rootDir, envTemplateDir),
    );
  }

  for (const d of DEFAULT_TEMPLATE_DIRS) {
    candidates.push(path.join(rootDir, d));
  }

  const gitmodulesPath = path.join(rootDir, ".gitmodules");
  if (fs.existsSync(gitmodulesPath)) {
    const gitmodules = fs.readFileSync(gitmodulesPath, "utf8");
    for (const submodule of parseGitmodules(gitmodules)) {
      candidates.push(path.join(rootDir, submodule.path));
    }
  }

  return [...new Set(candidates)];
}

function tryInitSubmodules(rootDir: string): void {
  const gitDir = path.join(rootDir, ".git");
  const gitmodulesPath = path.join(rootDir, ".gitmodules");

  if (!fs.existsSync(gitDir)) return;
  if (!fs.existsSync(gitmodulesPath)) return;

  if (!isGitAvailable(rootDir)) return;

  console.log("base-template missing; attempting to initialize git submodules...");
  runCommand("git", ["submodule", "update", "--init", "--recursive"], rootDir);
}

function tryCloneTemplate(rootDir: string, cloneTarget: string, cloneUrl: string): void {
  if (!isGitAvailable(rootDir)) {
    throw new Error(
      `Missing template directory and git is not available. Either install git, set FHEVM_TEMPLATE_DIR, or add base-template/ to the repo.`,
    );
  }

  if (!safeToReplaceDirectory(cloneTarget)) {
    throw new Error(
      `Template directory is missing and ${cloneTarget} exists but doesn't look like a template. Move it aside or set FHEVM_TEMPLATE_DIR to a valid template path.`,
    );
  }

  if (fs.existsSync(cloneTarget)) {
    fs.rmSync(cloneTarget, { recursive: true, force: true });
  }

  console.log(`base-template missing; cloning ${cloneUrl} into ${cloneTarget}...`);
  runCommand("git", ["clone", "--depth", "1", cloneUrl, cloneTarget], rootDir);
}

function pickCloneTarget(rootDir: string): { target: string; url: string } {
  const envTemplateDir = process.env.FHEVM_TEMPLATE_DIR;
  if (envTemplateDir) {
    const resolved = path.isAbsolute(envTemplateDir)
      ? envTemplateDir
      : path.join(rootDir, envTemplateDir);
    return { target: resolved, url: DEFAULT_TEMPLATE_GIT_URL };
  }

  const gitmodulesPath = path.join(rootDir, ".gitmodules");
  if (fs.existsSync(gitmodulesPath)) {
    const gitmodules = fs.readFileSync(gitmodulesPath, "utf8");
    const submodules = parseGitmodules(gitmodules);
    const templateSubmodule = submodules.find((s) => s.url?.includes("fhevm-hardhat-template"));
    if (templateSubmodule) {
      return {
        target: path.join(rootDir, templateSubmodule.path),
        url: templateSubmodule.url ?? DEFAULT_TEMPLATE_GIT_URL,
      };
    }
  }

  return { target: path.join(rootDir, "base-template"), url: DEFAULT_TEMPLATE_GIT_URL };
}

/**
 * Ensures a usable Hardhat template directory is present locally.
 *
 * This protects against:
 * - cloning the repo without `--recurse-submodules` (template submodule is empty)
 * - downloading the repo as a ZIP (no `.git`, so submodules can't be initialized)
 *
 * Resolution order:
 * 1) `FHEVM_TEMPLATE_DIR` (absolute or relative to repo root)
 * 2) `base-template/`
 * 3) `fhevm-hardhat-template/` (common submodule name)
 * 4) any `.gitmodules` submodule paths
 *
 * If no valid template is found, it attempts:
 * - `git submodule update --init --recursive` (when `.git` + `.gitmodules` exist)
 * - `git clone --depth 1` of the official template as a fallback
 */
export function ensureHardhatTemplateDir(rootDir: string): string {
  const candidates = resolveTemplateCandidates(rootDir);
  for (const c of candidates) {
    if (looksLikeHardhatTemplate(c)) return c;
  }

  tryInitSubmodules(rootDir);
  for (const c of candidates) {
    if (looksLikeHardhatTemplate(c)) return c;
  }

  const { target, url } = pickCloneTarget(rootDir);
  tryCloneTemplate(rootDir, target, url);

  if (looksLikeHardhatTemplate(target)) return target;

  throw new Error(
    `Could not find or fetch a valid template directory. Provide base-template/, run git submodule update --init --recursive, or set FHEVM_TEMPLATE_DIR.`,
  );
}
