/**
 * @title Generate SUMMARY.md
 * @description Generates GitBook SUMMARY.md from discovered examples
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadExampleRegistry } from "./example-registry";

const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const referenceDir = path.join(docsDir, "reference");
const registry = loadExampleRegistry(rootDir);

function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value
    .split(/[-_\s]+/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const categoryLinks = Array.from(registry.categories.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([category, examples]) => {
    const categoryTitle = titleCase(category);
    const exampleLinks = examples
      .map((example) => `  * [${example.title}](${category}/${example.docName}.md)`)
      .join("\n");

    return `* [${categoryTitle} Examples](${category}/README.md)\n${exampleLinks}`;
  })
  .join("\n");

const chapters = new Map<string, typeof registry.examples>();
for (const example of registry.examples) {
  for (const chapter of example.chapters ?? []) {
    if (!chapters.has(chapter)) {
      chapters.set(chapter, []);
    }
    chapters.get(chapter)?.push(example);
  }
}

const chapterLinks =
  chapters.size > 0
    ? `* [Chapters](chapters/README.md)\n${Array.from(chapters.keys())
        .sort((a, b) => a.localeCompare(b))
        .map((chapter) => `  * [${titleCase(chapter)}](chapters/${chapter}.md)`)
        .join("\n")}`
    : "";

const staticLinks = [
  "* [Introduction](README.md)",
  "* [Start Here](start-here.md)",
  "* [FHE 101](fhe-101.md)",
  "* [Common Pitfalls](pitfalls.md)",
  "* [Create Your Own Example](create-your-example.md)",
  "* [Learning Paths](learning-paths.md)",
].join("\n");

const referencePath = path.join(referenceDir, "README.md");
if (fs.existsSync(referenceDir)) {
  const referenceSections = fs
    .readdirSync(referenceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `- [${titleCase(name)}](./${name}/README.md)`)
    .join("\n");

  const referenceReadme = `# Reference\n\nAuto-generated contract reference pages from Solidity docgen.\n\n${referenceSections || "No reference sections generated yet."}\n`;
  fs.writeFileSync(referencePath, referenceReadme);

  for (const section of fs.readdirSync(referenceDir, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    const sectionDir = path.join(referenceDir, section.name);
    const entries = fs.readdirSync(sectionDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase() !== "readme.md")
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `- [${name.replace(/\.md$/i, "")}](./${name})`)
      .join("\n");
    const subdirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `- [${titleCase(name)}](./${name}/README.md)`)
      .join("\n");

    const sectionReadme = `# ${titleCase(section.name)} Reference\n\n${files || "No reference files generated yet."}\n\n${subdirs ? `## Subsections\n\n${subdirs}\n` : ""}`;
    fs.writeFileSync(path.join(sectionDir, "README.md"), sectionReadme);
  }
}

const referenceLink = fs.existsSync(referencePath) ? "\n* [Reference](reference/README.md)" : "";

const summary = `# Summary

${staticLinks}
${chapterLinks ? `${chapterLinks}\n` : ""}${categoryLinks}${referenceLink}
`;

fs.writeFileSync(path.join(docsDir, "SUMMARY.md"), summary);
console.log("Generated SUMMARY.md from contract registry");
