import fs from "node:fs";
import path from "node:path";

import type { DeployArg, DeployStep } from "./deploy-script-generators";

export type ExampleMeta = {
  slug: string;
  title: string;
  category: string;
  concept: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  chapters: string[];
  notice?: string;
  contractName: string;
  docName: string;
  contractFile: string;
  testFile?: string;
  dependsOn: string[];
  helperFiles: string[];
  mockFiles: string[];
  extraContractFiles: string[];
  deployPlan?: DeployStep[];
  packageDependencies: string[];
  packageDevDependencies: string[];
};

export type ExampleRegistry = {
  examples: ExampleMeta[];
  bySlug: Map<string, ExampleMeta>;
  categories: Map<string, ExampleMeta[]>;
};

const DEFAULT_DIFFICULTY: ExampleMeta["difficulty"] = "Intermediate";

function isDirectory(entryPath: string): boolean {
  return fs.statSync(entryPath).isDirectory();
}

function walkDir(dir: string, ignoreDirs: Set<string>): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      results.push(...walkDir(fullPath, ignoreDirs));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function normalizeExampleBaseName(fileBase: string): string {
  if (fileBase.endsWith("ExampleFactory")) {
    return fileBase.replace(/ExampleFactory$/u, "");
  }
  if (fileBase.endsWith("Example")) {
    return fileBase.replace(/Example$/u, "");
  }
  return fileBase;
}

function extractTag(content: string, tag: string): string | undefined {
  const regex = new RegExp(`@${tag}\\s+([^\\n*]+)`);
  const match = content.match(regex);
  return match?.[1]?.trim();
}

function extractCustomTag(content: string, tag: string): string | undefined {
  return extractTag(content, `custom:${tag}`);
}

function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function extractContractNames(content: string): string[] {
  const cleaned = stripComments(content);
  const regex = /\b(contract|interface|library)\s+(\w+)/g;
  const results: string[] = [];
  let match: RegExpExecArray | null = regex.exec(cleaned);
  while (match) {
    results.push(match[2]);
    match = regex.exec(cleaned);
  }
  return results;
}

function extractPrimaryContractName(content: string): string | undefined {
  const cleaned = stripComments(content);
  const regex = /\bcontract\s+(\w+)/;
  const match = cleaned.match(regex);
  return match?.[1];
}

function parseDependsOn(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseChapters(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => toKebabCase(entry));
}

function normalizeDeployArg(arg: unknown): DeployArg {
  if (typeof arg === "string") {
    if (arg.startsWith("@")) return { ref: arg.slice(1) };
    if (arg === "$deployer") return { signer: "deployer" };
    if (arg.startsWith("#")) return { expr: arg.slice(1) };
    return { literal: arg };
  }
  if (typeof arg === "number") {
    return { value: arg };
  }
  if (typeof arg === "object" && arg !== null) {
    return arg as DeployArg;
  }
  return { literal: String(arg) };
}

function parseDeployPlan(raw?: string): DeployStep[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as DeployStep[];
    if (!Array.isArray(parsed)) {
      throw new Error("deploy plan must be an array");
    }
    return parsed.map((step) => ({
      ...step,
      args: step.args ? step.args.map((arg) => normalizeDeployArg(arg)) : undefined,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid @custom:deploy-plan JSON: ${message}`);
  }
}

function resolveImportPath(baseFile: string, importPath: string): string | null {
  if (!importPath.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(baseFile), importPath);
  const withExt = resolved.endsWith(".sol") ? resolved : `${resolved}.sol`;
  return fs.existsSync(withExt) ? withExt : null;
}

function extractImports(content: string): string[] {
  const regex = /import\s+[^;]*from\s+["']([^"']+)["'];/g;
  const imports: string[] = [];
  let match: RegExpExecArray | null = regex.exec(content);
  while (match) {
    imports.push(match[1]);
    match = regex.exec(content);
  }
  return imports;
}

function getPackageName(importPath: string): string | null {
  if (importPath.startsWith(".")) return null;
  if (importPath.startsWith("@")) {
    const [scope, name] = importPath.split("/");
    if (!name) return null;
    return `${scope}/${name}`;
  }
  return importPath.split("/")[0] ?? null;
}

function extractPackageImports(content: string): string[] {
  return extractImports(content)
    .map((importPath) => getPackageName(importPath))
    .filter((value): value is string => Boolean(value));
}

function normalizeDifficulty(raw?: string): ExampleMeta["difficulty"] {
  if (!raw) return DEFAULT_DIFFICULTY;
  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith("begin")) return "Beginner";
  if (normalized.startsWith("adv")) return "Advanced";
  return "Intermediate";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function loadExampleRegistry(rootDir: string): ExampleRegistry {
  const contractsDir = path.join(rootDir, "contracts");
  const testDir = path.join(rootDir, "test");

  const categoryDirs = fs
    .readdirSync(contractsDir)
    .map((entry) => path.join(contractsDir, entry))
    .filter((entry) => isDirectory(entry));

  const ignoreDirs = new Set(["helpers", "mocks"]);
  const allSolFiles = categoryDirs.flatMap((dir) => walkDir(dir, new Set<string>()));

  const nameToFile = new Map<string, string>();
  for (const file of allSolFiles) {
    if (!file.endsWith(".sol")) continue;
    const content = fs.readFileSync(file, "utf8");
    const names = extractContractNames(content);
    for (const name of names) {
      if (!nameToFile.has(name)) {
        nameToFile.set(name, file);
      }
    }
  }

  const exampleFiles = categoryDirs.flatMap((dir) => walkDir(dir, ignoreDirs));
  const examples: ExampleMeta[] = [];

  for (const file of exampleFiles) {
    if (!file.endsWith(".sol")) continue;
    const content = fs.readFileSync(file, "utf8");
    const contractName = extractPrimaryContractName(content);
    if (!contractName) continue;
    const fileBase = path.basename(file, ".sol");
    const exampleBase = normalizeExampleBaseName(fileBase);

    const folderCategory = path.basename(path.dirname(file));
    const categoryTag = extractCustomTag(content, "category");
    const category = categoryTag ?? folderCategory;

    const title = extractTag(content, "title") ?? exampleBase;
    const notice = extractTag(content, "notice");
    const concept = extractCustomTag(content, "concept") ?? notice ?? "fhEVM example";
    const difficulty = normalizeDifficulty(extractCustomTag(content, "difficulty"));
    const chapters = parseChapters(extractCustomTag(content, "chapter"));

    const dependsOn = parseDependsOn(extractCustomTag(content, "depends-on"));
    const deployPlan = parseDeployPlan(extractCustomTag(content, "deploy-plan"));

    const customTest = extractCustomTag(content, "test");
    const testCategories =
      categoryTag && categoryTag !== folderCategory ? [categoryTag, folderCategory] : [category];
    const defaultTestCandidates = testCategories.map((cat) =>
      path.join(testDir, cat, `${fileBase}.test.ts`),
    );
    const fallbackFullFlowCandidates = testCategories.map((cat) =>
      path.join(testDir, cat, "FullFlow.test.ts"),
    );

    let testFile: string | undefined;
    if (customTest) {
      const customCandidates = testCategories.map((cat) => path.join(testDir, cat, customTest));
      testFile = customCandidates.find((candidate) => fs.existsSync(candidate));
    } else {
      testFile = defaultTestCandidates.find((candidate) => fs.existsSync(candidate));
      if (!testFile && dependsOn.length > 0) {
        testFile = fallbackFullFlowCandidates.find((candidate) => fs.existsSync(candidate));
      }
    }

    const importPaths = extractImports(content)
      .map((importPath) => resolveImportPath(file, importPath))
      .filter((resolved): resolved is string => Boolean(resolved));

    const helperFiles = uniqueStrings(
      importPaths.filter((importPath) => importPath.includes(`${path.sep}helpers${path.sep}`)),
    );

    const mockFiles = uniqueStrings(
      importPaths.filter((importPath) => importPath.includes(`${path.sep}mocks${path.sep}`)),
    );

    const dependencyFilesFromTags = dependsOn
      .map((name) => nameToFile.get(name))
      .filter((resolved): resolved is string => Boolean(resolved));

    const dependencyHelpers = dependencyFilesFromTags.filter((dep) =>
      dep.includes(`${path.sep}helpers${path.sep}`),
    );
    const dependencyMocks = dependencyFilesFromTags.filter((dep) =>
      dep.includes(`${path.sep}mocks${path.sep}`),
    );
    const dependencyContracts = dependencyFilesFromTags.filter(
      (dep) =>
        !dep.includes(`${path.sep}helpers${path.sep}`) &&
        !dep.includes(`${path.sep}mocks${path.sep}`),
    );

    const extraContractFiles = uniqueStrings([
      ...dependencyContracts,
      ...importPaths.filter(
        (importPath) =>
          !importPath.includes(`${path.sep}helpers${path.sep}`) &&
          !importPath.includes(`${path.sep}mocks${path.sep}`),
      ),
    ]);

    const resolvedHelperFiles = uniqueStrings([...helperFiles, ...dependencyHelpers]);
    const resolvedMockFiles = uniqueStrings([...mockFiles, ...dependencyMocks]);

    const dependencyFiles = uniqueStrings([
      file,
      ...extraContractFiles,
      ...resolvedHelperFiles,
      ...resolvedMockFiles,
    ]);

    const packageDependencies = uniqueStrings(
      dependencyFiles.flatMap((depFile) => extractPackageImports(fs.readFileSync(depFile, "utf8"))),
    );

    const packageDevDependencies = uniqueStrings(
      (testFile && fs.existsSync(testFile)
        ? extractPackageImports(fs.readFileSync(testFile, "utf8"))
        : []
      ).filter((pkg) => !packageDependencies.includes(pkg)),
    );

    const slug = toKebabCase(exampleBase);

    examples.push({
      slug,
      title,
      category,
      concept,
      difficulty,
      chapters,
      notice,
      contractName,
      docName: fileBase,
      contractFile: file,
      testFile: testFile && fs.existsSync(testFile) ? testFile : undefined,
      dependsOn,
      helperFiles: resolvedHelperFiles,
      mockFiles: resolvedMockFiles,
      extraContractFiles,
      deployPlan,
      packageDependencies,
      packageDevDependencies,
    });
  }

  examples.sort((a, b) => a.slug.localeCompare(b.slug));

  const bySlug = new Map(examples.map((example) => [example.slug, example]));
  const categories = new Map<string, ExampleMeta[]>();
  for (const example of examples) {
    if (!categories.has(example.category)) {
      categories.set(example.category, []);
    }
    categories.get(example.category)?.push(example);
  }

  for (const group of categories.values()) {
    group.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return { examples, bySlug, categories };
}
