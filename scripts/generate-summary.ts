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

  const referenceReadme = `# API Reference

This section provides **function-level API documentation** for all contracts, including:
- Function signatures with parameter types
- NatSpec documentation (@notice, @param, @return)
- Events, errors, and state variables

> 📖 For **tutorials and runnable examples**, see the [Example Pages](../README.md).

## By Category

${referenceSections || "No reference sections generated yet."}
`;
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

    const sectionReadme = `# ${titleCase(section.name)} Reference

API documentation for ${titleCase(section.name)} contracts.

> 📖 For tutorials, see [${titleCase(section.name)} Examples](../../${section.name}/README.md).

## Contracts

${files || "No reference files generated yet."}
${subdirs ? `\n## Helpers & Mocks\n\n${subdirs}\n` : ""}`;
    fs.writeFileSync(path.join(sectionDir, "README.md"), sectionReadme);
  }
}

// Generate full reference navigation with all contracts listed
function generateReferenceLinks(): string {
  if (!fs.existsSync(referenceDir)) return "";

  const sections = fs
    .readdirSync(referenceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (sections.length === 0) return "";

  const sectionLinks = sections
    .map((section) => {
      const sectionDir = path.join(referenceDir, section);
      const entries = fs.readdirSync(sectionDir, { withFileTypes: true });

      // Get top-level contract files
      const contractFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name)
        .filter((name) => name.toLowerCase() !== "readme.md")
        .sort((a, b) => a.localeCompare(b))
        .map((name) => {
          const contractName = name.replace(/\.md$/i, "");
          return `    * [${contractName}](reference/${section}/${name})`;
        });

      // Get subdirectory contracts (helpers, mocks)
      const subdirFiles = entries
        .filter((entry) => entry.isDirectory())
        .flatMap((subdir) => {
          const subdirPath = path.join(sectionDir, subdir.name);
          return fs
            .readdirSync(subdirPath)
            .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
            .sort((a, b) => a.localeCompare(b))
            .map((file) => {
              const contractName = file.replace(/\.md$/i, "");
              return `    * [${contractName}](reference/${section}/${subdir.name}/${file})`;
            });
        });

      const allContracts = [...contractFiles, ...subdirFiles].join("\n");
      return `  * [${titleCase(section)}](reference/${section}/README.md)\n${allContracts}`;
    })
    .join("\n");

  return `* [API Reference](reference/README.md)\n${sectionLinks}`;
}

const referenceLinks = generateReferenceLinks();

const summary = `# Summary

${staticLinks}
${chapterLinks ? `${chapterLinks}\n` : ""}${categoryLinks}
${referenceLinks}
`;

fs.writeFileSync(path.join(docsDir, "SUMMARY.md"), summary);
console.log("Generated SUMMARY.md from contract registry");
