/**
 * @title Generate SUMMARY.md
 * @description Generates GitBook SUMMARY.md by scanning the docs/ directory.
 *
 * KEY PRINCIPLE: File-driven, not registry-driven.
 * - Scans actual files in docs/
 * - Extracts titles from H1 headers
 * - No hardcoded slugs or titles
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { titleCase } from "./lib/text-utils";

const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");

// Folders that are NOT categories (special purpose folders)
const NON_CATEGORY_FOLDERS = new Set(["chapters", "reference"]);

// Files to exclude from navigation
const EXCLUDED_FILES = ["README.md", "SUMMARY.md", "catalog.json"];

/**
 * Discover category folders by scanning docs/ directory.
 * Categories are any folder that isn't in NON_CATEGORY_FOLDERS.
 */
function discoverCategories(): string[] {
  return fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !NON_CATEGORY_FOLDERS.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Extract H1 title from markdown content
 */
function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

/**
 * Get title from a markdown file (extracted from H1 header)
 */
function getTitleFromFile(filePath: string, fallback: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return extractH1(content) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Scan root-level static pages (excluding categories, chapters, reference)
 */
function scanStaticPages(): string[] {
  const entries: string[] = [];
  const files = fs.readdirSync(docsDir, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile()) continue;
    if (!file.name.endsWith(".md")) continue;
    if (EXCLUDED_FILES.includes(file.name)) continue;

    const filePath = path.join(docsDir, file.name);
    const slug = file.name.replace(/\.md$/, "");
    const title = getTitleFromFile(filePath, titleCase(slug));

    entries.push(`* [${title}](${file.name})`);
  }

  return entries.sort();
}

/**
 * Scan chapters folder and build navigation
 */
function scanChapters(): string {
  const chaptersDir = path.join(docsDir, "chapters");
  if (!fs.existsSync(chaptersDir)) return "";

  const entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  const chapterLinks = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .filter((entry) => entry.name.toLowerCase() !== "readme.md")
    .map((entry) => {
      const filePath = path.join(chaptersDir, entry.name);
      const slug = entry.name.replace(/\.md$/, "");
      const title = getTitleFromFile(filePath, titleCase(slug));
      return `  * [${title}](chapters/${entry.name})`;
    })
    .sort()
    .join("\n");

  if (!chapterLinks) return "";

  return `* [Chapters](chapters/README.md)\n${chapterLinks}`;
}

/**
 * Scan category folders (identity, basic, etc.) and build navigation
 */
function scanCategories(): string[] {
  const sections: string[] = [];
  const categories = discoverCategories();

  for (const category of categories) {
    const categoryDir = path.join(docsDir, category);

    const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
    const exampleLinks = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .filter((entry) => entry.name.toLowerCase() !== "readme.md")
      .map((entry) => {
        const filePath = path.join(categoryDir, entry.name);
        const title = getTitleFromFile(filePath, entry.name.replace(/\.md$/, ""));
        return `  * [${title}](${category}/${entry.name})`;
      })
      .sort()
      .join("\n");

    if (exampleLinks) {
      sections.push(`* [${titleCase(category)} Examples](${category}/README.md)\n${exampleLinks}`);
    }
  }

  return sections;
}

/**
 * Main: Generate SUMMARY.md by scanning docs/
 */
function main(): void {
  const introLink = "* [Introduction](README.md)";
  const staticPages = scanStaticPages();
  const chapters = scanChapters();
  const categories = scanCategories();

  const sections = [introLink, ...staticPages, chapters, ...categories].filter(Boolean);

  const summary = `# Summary

${sections.join("\n")}
`;

  fs.writeFileSync(path.join(docsDir, "SUMMARY.md"), summary);
  console.log("Generated SUMMARY.md from docs/ file structure");
}

main();
