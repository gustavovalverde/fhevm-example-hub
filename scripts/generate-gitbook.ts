import fs from "node:fs";
import path from "node:path";

import type { DeployArg, DeployStep } from "./deploy-script-generators";
import { type ExampleMeta, loadExampleRegistry } from "./example-registry";
import { titleCase } from "./lib/text-utils";

const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const staticDocsDir = path.join(rootDir, "static-docs");
const registry = loadExampleRegistry(rootDir);

type CliOptions = {
  exampleSlug?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--example" || arg === "-e") {
      options.exampleSlug = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--all") {
      options.exampleSlug = undefined;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        `Usage:\n  tsx scripts/generate-gitbook.ts --all\n  tsx scripts/generate-gitbook.ts --example <example-slug>\n\nExamples:\n  tsx scripts/generate-gitbook.ts --all\n  tsx scripts/generate-gitbook.ts --example fhe-counter\n`,
      );
      process.exit(0);
    }
    if (!arg.startsWith("-") && !options.exampleSlug) {
      options.exampleSlug = arg;
    }
  }
  return options;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeDoc(relPath: string, content: string): void {
  const fullPath = path.join(docsDir, relPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, `${content.trimEnd()}\n`);
}

function readFile(filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  return fs.readFileSync(resolved, "utf8");
}

function codeBlock(language: string, content: string): string {
  return `\n\n\`\`\`${language}\n${content.trimEnd()}\n\`\`\`\n`;
}

/**
 * Extract API reference content from a reference markdown file.
 * Skips the H1 header and metadata block, keeps everything from "## Overview" onwards.
 */
function extractApiContent(refContent: string): string {
  // Find the first H2 or H3 heading (start of actual content)
  const match = refContent.match(/^(#{2,3}\s+.+)$/m);
  if (!match || match.index === undefined) return "";
  return refContent.slice(match.index).trim();
}

/**
 * Read and extract API reference for an example.
 * Returns the API content or empty string if reference file doesn't exist.
 */
function getApiReference(category: string, docName: string): string {
  const refPath = path.join(docsDir, "reference", category, `${docName}.md`);
  if (!fs.existsSync(refPath)) return "";

  const refContent = fs.readFileSync(refPath, "utf8");
  return extractApiContent(refContent);
}

function extractPitfalls(testContent?: string): string[] {
  if (!testContent) return [];
  const regex = /\bit\s*\(\s*(["'`])([^"'`]*pitfall[^"'`]*)\1/gi;
  const results: string[] = [];
  let match: RegExpExecArray | null = regex.exec(testContent);
  while (match) {
    const raw = match[2].trim();
    const cleaned = raw.replace(/\s*\(pitfall\)\s*/gi, "").trim();
    results.push(cleaned.length > 0 ? cleaned : raw);
    match = regex.exec(testContent);
  }
  return Array.from(new Set(results));
}

function renderDeployArg(arg: DeployArg): string {
  if ("ref" in arg) return `@${arg.ref}`;
  if ("signer" in arg) return `$${arg.signer}`;
  if ("expr" in arg) return `#${arg.expr}`;
  if ("literal" in arg) return JSON.stringify(arg.literal);
  if ("value" in arg) return String(arg.value);
  return JSON.stringify(arg);
}

function formatChapters(chapters: string[]): string {
  if (chapters.length === 0) return "Uncategorized";
  return chapters.map((chapter) => titleCase(chapter)).join(", ");
}

function renderDeployPlan(plan?: DeployStep[]): string | undefined {
  if (!plan || plan.length === 0) return undefined;
  const lines = ["| Step | Contract | Args | Saves As |", "| --- | --- | --- | --- |"];

  plan.forEach((step, index) => {
    const args =
      step.args && step.args.length > 0 ? step.args.map(renderDeployArg).join(", ") : "-";
    const saveAs = step.saveAs ?? "-";
    lines.push(`| ${index + 1} | ${step.contract} | ${args} | ${saveAs} |`);
  });

  return lines.join("\n");
}

function renderDependencies(example: ExampleMeta, byContract: Map<string, ExampleMeta>): string {
  if (example.dependsOn.length === 0) return "None";
  return example.dependsOn
    .map((dep) => dep.trim())
    .filter((dep) => dep.length > 0)
    .map((dep) => {
      const meta = byContract.get(dep);
      if (!meta) return dep;
      const rel =
        meta.category === example.category
          ? `${meta.docName}.md`
          : `../${meta.category}/${meta.docName}.md`;
      return `[${dep}](${rel})`;
    })
    .map((dep) => `- ${dep}`)
    .join("\n");
}

function generateExampleDoc(example: ExampleMeta, byContract: Map<string, ExampleMeta>): string {
  const contractContent = readFile(example.contractFile);
  const testContent = example.testFile ? readFile(example.testFile) : undefined;
  const pitfalls = extractPitfalls(testContent);
  const deployPlan = renderDeployPlan(example.deployPlan);
  const contractFileName = path.basename(example.contractFile);
  const testFileName = example.testFile ? path.basename(example.testFile) : "";
  const testPath = example.testFile
    ? path.relative(rootDir, example.testFile).replace(/\\/g, "/")
    : undefined;

  const quickStart = testPath ? `npm run test:mocked -- ${testPath}` : "npm run test:mocked";

  // Get inlined API reference content
  const apiContent = getApiReference(example.category, example.docName);
  const apiSection = apiContent ? `\n## API Reference\n\n${apiContent}\n` : "";

  return `# ${example.title}

> **Category**: ${titleCase(example.category)} | **Difficulty**: ${example.difficulty} | **Chapters**: ${formatChapters(example.chapters)} | **Concept**: ${example.concept}

${example.notice ?? ""}

## Why this example

This example focuses on **${example.concept}**. It is designed to be self-contained and easy to run locally.

## Quick start

\`\`\`bash
npm install
${quickStart}
\`\`\`

## Dependencies

${renderDependencies(example, byContract)}

${deployPlan ? `## Deployment plan\n\n${deployPlan}\n` : ""}

## Contract and test

{% tabs %}

{% tab title="${contractFileName}" %}
${codeBlock("solidity", contractContent)}
{% endtab %}

{% tab title="${testFileName || "Test"}" %}
${testContent ? codeBlock("typescript", testContent) : "No test file available for this example."}
{% endtab %}

{% endtabs %}

## Pitfalls to avoid

${pitfalls.length === 0 ? "No pitfalls are highlighted in the tests for this example." : pitfalls.map((item) => `- ${item}`).join("\n")}
${apiSection}`;
}

function generateCategoryReadme(category: string, examples: ExampleMeta[]): string {
  const byDifficulty = new Map<ExampleMeta["difficulty"], ExampleMeta[]>([
    ["Beginner", []],
    ["Intermediate", []],
    ["Advanced", []],
  ]);

  examples.forEach((example) => {
    byDifficulty.get(example.difficulty)?.push(example);
  });

  const sections = Array.from(byDifficulty.entries())
    .filter(([, list]) => list.length > 0)
    .map(([difficulty, list]) => {
      const links = list
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((example) => `- **[${example.title}](${example.docName}.md)** - ${example.concept}`)
        .join("\n");
      return `### ${difficulty}\n\n${links}`;
    })
    .join("\n\n");

  return `# ${titleCase(category)} Examples

Each example in this category is designed to be self-contained and runnable. Start with Beginner examples if you are new to fhEVM.

${sections}
`;
}

function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function scanStaticPages(): Array<{ slug: string; title: string }> {
  if (!fs.existsSync(staticDocsDir)) return [];

  return fs
    .readdirSync(staticDocsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const slug = entry.name.replace(/\.md$/, "");
      const filePath = path.join(staticDocsDir, entry.name);
      const content = fs.readFileSync(filePath, "utf8");
      const title = extractH1(content) ?? titleCase(slug);
      return { slug, title };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function generateIntroPage(categories: Map<string, ExampleMeta[]>): string {
  const categorySections = Array.from(categories.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, examples]) => {
      const rows = examples
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(
          (example) =>
            `| [${example.title}](./${category}/${example.docName}.md) | ${example.concept} | ${example.difficulty} |`,
        )
        .join("\n");

      return `### ${titleCase(category)}\n\n| Example | Concept | Difficulty |\n| --- | --- | --- |\n${rows}`;
    })
    .join("\n\n");

  // Build intro links by scanning docs-src/pages/ (file-driven)
  const staticPages = scanStaticPages();
  const introLinks = staticPages.map((page) => `- **[${page.title}](${page.slug}.md)**`).join("\n");

  // Add dynamic pages to intro
  const dynamicLinks = [
    "- **[Common Pitfalls](pitfalls.md)**",
    "- **[Learning Paths](learning-paths.md)**",
  ].join("\n");

  return `# fhEVM Examples

Welcome to the fhEVM Examples library. These examples span multiple categories and are designed to help you learn privacy-preserving smart contract patterns step by step.

## Start here

${introLinks}
${dynamicLinks}
- Want to browse by topic? See **[Chapters](chapters/README.md)**.

## Example map

${categorySections}
`;
}

function generateLearningPaths(examples: ExampleMeta[]): string {
  const order: ExampleMeta["difficulty"][] = ["Beginner", "Intermediate", "Advanced"];
  const groups = new Map<ExampleMeta["difficulty"], ExampleMeta[]>();
  for (const difficulty of order) {
    groups.set(difficulty, []);
  }

  examples.forEach((example) => {
    groups.get(example.difficulty)?.push(example);
  });

  const sections = order
    .map((difficulty) => {
      const list = groups
        .get(difficulty)
        ?.sort((a, b) => a.title.localeCompare(b.title))
        .map(
          (example) =>
            `- [${example.title}](./${example.category}/${example.docName}.md) - ${example.concept}`,
        )
        .join("\n");

      return `## ${difficulty}\n\n${list || "No examples yet."}`;
    })
    .join("\n\n");

  return `# Learning Paths\n\nUse this page to pick examples by difficulty.\n\n${sections}\n`;
}

function generateChaptersIndex(chapters: Map<string, ExampleMeta[]>): string {
  const chapterLinks = Array.from(chapters.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((chapter) => `- [${titleCase(chapter)}](./${chapter}.md)`)
    .join("\n");

  return `# Chapters\n\nUse these chapter pages to explore examples by topic.\n\n${chapterLinks}\n`;
}

function generateChapterPage(chapter: string, examples: ExampleMeta[]): string {
  const links = examples
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(
      (example) =>
        `- [${example.title}](../${example.category}/${example.docName}.md) - ${example.concept}`,
    )
    .join("\n");

  return `# ${titleCase(chapter)}\n\n${links}\n`;
}

function buildChapterMap(examples: ExampleMeta[]): Map<string, ExampleMeta[]> {
  const chapters = new Map<string, ExampleMeta[]>();
  for (const example of examples) {
    for (const chapter of example.chapters) {
      if (!chapters.has(chapter)) {
        chapters.set(chapter, []);
      }
      chapters.get(chapter)?.push(example);
    }
  }
  return chapters;
}

function generatePitfallsPage(examples: ExampleMeta[]): string {
  const entries = examples
    .map((example) => {
      const testContent = example.testFile ? readFile(example.testFile) : undefined;
      const pitfalls = extractPitfalls(testContent);
      if (pitfalls.length === 0) return null;
      const items = pitfalls.map((item) => `  - ${item}`).join("\n");
      return `- **[${example.title}](./${example.category}/${example.docName}.md)**\n${items}`;
    })
    .filter((entry): entry is string => Boolean(entry));

  return `# Common Pitfalls\n\nThis page aggregates known pitfalls called out in the tests.\n\n${entries.length === 0 ? "No pitfalls captured yet." : entries.join("\n\n")}\n`;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  let targetCategories: Set<string> | undefined;

  if (options.exampleSlug) {
    const example = registry.bySlug.get(options.exampleSlug);
    if (!example) {
      console.error(`Unknown example: ${options.exampleSlug}\n`);
      console.error(
        `Available examples:\n${registry.examples.map((item) => `  - ${item.slug}`).join("\n")}`,
      );
      process.exit(1);
    }
    targetCategories = new Set([example.category]);
  }

  const byContract = new Map<string, ExampleMeta>();
  registry.examples.forEach((example) => {
    byContract.set(example.contractName, example);
  });
  const chapters = buildChapterMap(registry.examples);

  ensureDir(docsDir);

  // Generate intro page
  writeDoc("README.md", generateIntroPage(registry.categories));

  // Copy static pages from docs-src/pages/ (file-driven)
  if (fs.existsSync(staticDocsDir)) {
    for (const entry of fs.readdirSync(staticDocsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = fs.readFileSync(path.join(staticDocsDir, entry.name), "utf8");
        const slug = entry.name.replace(/\.md$/, "");
        writeDoc(`${slug}.md`, content);
      }
    }
  }

  // Generate dynamic pages
  writeDoc("pitfalls.md", generatePitfallsPage(registry.examples));
  writeDoc("learning-paths.md", generateLearningPaths(registry.examples));

  // Generate chapters
  writeDoc("chapters/README.md", generateChaptersIndex(chapters));

  for (const [chapter, examples] of chapters.entries()) {
    writeDoc(`chapters/${chapter}.md`, generateChapterPage(chapter, examples));
  }

  for (const [category, examples] of registry.categories.entries()) {
    if (targetCategories && !targetCategories.has(category)) continue;
    const categoryDir = path.join(docsDir, category);
    ensureDir(categoryDir);
    writeDoc(`${category}/README.md`, generateCategoryReadme(category, examples));

    for (const example of examples) {
      if (options.exampleSlug && example.slug !== options.exampleSlug) continue;
      const docPath = `${category}/${example.docName}.md`;
      writeDoc(docPath, generateExampleDoc(example, byContract));
    }
  }

  console.log(
    options.exampleSlug
      ? `Generated GitBook docs for ${options.exampleSlug}`
      : "Generated GitBook docs from registry",
  );
}

main();
