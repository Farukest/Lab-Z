#!/usr/bin/env ts-node
/**
 * generate-docs.ts
 *
 * Generates GitBook-compatible documentation from templates.
 *
 * Usage:
 *   npx ts-node scripts/generate-docs.ts
 *   npm run docs:generate
 */

import fs from 'fs-extra';
import path from 'path';

// Use project root (script is always run from root via npm run docs:generate)
const ROOT_DIR = process.cwd();

interface TemplateBlock {
  id: string;
  type: string;
  lines: [number, number];
  explanation: string;
  searchTerms?: string[];
}

interface TemplateMeta {
  id: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  description: string;
  longDescription?: string;
  blocks?: TemplateBlock[];
  files: Array<{ path: string; source: string }>;
  fheOperations?: string[];
  fheTypes?: string[];
  relatedTemplates?: string[];
  prerequisites?: string[];
  nextSteps?: string[];
}

interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  order: number;
}

const CATEGORIES: CategoryInfo[] = [
  { id: 'basics', name: 'Basics', icon: '📦', order: 1 },
  { id: 'encryption', name: 'Encryption', icon: '🔐', order: 2 },
  { id: 'decryption', name: 'Decryption', icon: '🔓', order: 3 },
  { id: 'acl', name: 'Access Control', icon: '🔒', order: 4 },
  { id: 'handles', name: 'Understanding Handles', icon: '🔑', order: 5 },
  { id: 'input-proofs', name: 'Input Proofs', icon: '🛡️', order: 6 },
  { id: 'anti-patterns', name: 'Anti-Patterns', icon: '⚠️', order: 7 },
  { id: 'openzeppelin', name: 'OpenZeppelin Contracts', icon: '🏗️', order: 8 },
  { id: 'advanced', name: 'Advanced', icon: '🚀', order: 9 },
];

const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates', 'creatable');
const DOCS_OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'examples');

/**
 * Read all templates from templates directory
 */
async function readTemplates(): Promise<TemplateMeta[]> {
  const templates: TemplateMeta[] = [];
  const categories = await fs.readdir(TEMPLATES_DIR);

  for (const category of categories) {
    const categoryPath = path.join(TEMPLATES_DIR, category);
    const stat = await fs.stat(categoryPath);

    if (!stat.isDirectory() || category.startsWith('_') || category.startsWith('.')) {
      continue;
    }

    // Check if category itself is a template (has meta.json)
    const categoryMetaPath = path.join(categoryPath, 'meta.json');
    if (await fs.pathExists(categoryMetaPath)) {
      try {
        const meta = await fs.readJson(categoryMetaPath);
        templates.push(meta);
      } catch (e) {
        console.warn(`Failed to read ${categoryMetaPath}`);
      }
    }

    // Check for sub-templates
    const items = await fs.readdir(categoryPath);
    for (const item of items) {
      const itemPath = path.join(categoryPath, item);
      const itemStat = await fs.stat(itemPath);

      if (!itemStat.isDirectory()) continue;

      const metaPath = path.join(itemPath, 'meta.json');
      if (await fs.pathExists(metaPath)) {
        try {
          const meta = await fs.readJson(metaPath);
          templates.push(meta);
        } catch (e) {
          console.warn(`Failed to read ${metaPath}`);
        }
      }
    }
  }

  return templates;
}

/**
 * Read contract source code
 */
async function readContract(templateId: string, category: string): Promise<string | null> {
  const possiblePaths = [
    path.join(TEMPLATES_DIR, category, templateId, `${templateId}.sol`),
    path.join(TEMPLATES_DIR, category, `${templateId}.sol`),
    path.join(TEMPLATES_DIR, templateId, `${templateId}.sol`),
  ];

  // Also check for files in meta.json
  for (const p of possiblePaths) {
    if (await fs.pathExists(p)) {
      return await fs.readFile(p, 'utf-8');
    }
  }

  // Try to find any .sol file
  const searchPaths = [
    path.join(TEMPLATES_DIR, category, templateId),
    path.join(TEMPLATES_DIR, category),
    path.join(TEMPLATES_DIR, templateId),
  ];

  for (const searchPath of searchPaths) {
    if (await fs.pathExists(searchPath)) {
      const files = await fs.readdir(searchPath);
      const solFile = files.find(f => f.endsWith('.sol') && !f.includes('.test'));
      if (solFile) {
        return await fs.readFile(path.join(searchPath, solFile), 'utf-8');
      }
    }
  }

  return null;
}

/**
 * Generate markdown for a single template
 */
function generateTemplateMarkdown(meta: TemplateMeta, contractCode: string | null): string {
  const difficultyEmoji = {
    beginner: '🟢',
    intermediate: '🟡',
    advanced: '🔴',
  }[meta.difficulty];

  const categoryInfo = CATEGORIES.find(c => c.id === meta.category);
  const categoryDisplay = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.name}` : meta.category;

  let md = `# ${meta.name}\n\n`;
  md += `${difficultyEmoji} **${meta.difficulty.charAt(0).toUpperCase() + meta.difficulty.slice(1)}** | ${categoryDisplay}\n\n`;
  md += `${meta.description}\n\n`;

  if (meta.longDescription) {
    md += `## Overview\n\n${meta.longDescription}\n\n`;
  }

  // Quick start
  md += `## Quick Start\n\n`;
  md += '```bash\n';
  md += `# Create new project from this template\n`;
  md += `npx labz create ${meta.id} my-project\n\n`;
  md += `# Navigate and install\n`;
  md += `cd my-project\n`;
  md += `npm install\n\n`;
  md += `# Run tests\n`;
  md += `npx hardhat test\n`;
  md += '```\n\n';

  // Contract code
  if (contractCode) {
    md += `## Contract\n\n`;
    md += '```solidity\n';
    md += contractCode;
    md += '\n```\n\n';
  }

  // Block explanations
  if (meta.blocks && meta.blocks.length > 0) {
    md += `## Code Explanation\n\n`;
    for (const block of meta.blocks) {
      md += `### ${block.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
      md += `${block.explanation}\n\n`;
      if (block.lines) {
        md += `*Lines ${block.lines[0]}-${block.lines[1]}*\n\n`;
      }
    }
  }

  // FHE Operations
  if (meta.fheOperations && meta.fheOperations.length > 0) {
    md += `## FHE Operations Used\n\n`;
    md += meta.fheOperations.map(op => `- \`FHE.${op}()\``).join('\n');
    md += '\n\n';
  }

  // FHE Types
  if (meta.fheTypes && meta.fheTypes.length > 0) {
    md += `## FHE Types Used\n\n`;
    md += meta.fheTypes.map(t => `- \`${t}\``).join('\n');
    md += '\n\n';
  }

  // Tags
  if (meta.tags && meta.tags.length > 0) {
    md += `## Tags\n\n`;
    md += meta.tags.map(t => `\`${t}\``).join(' ');
    md += '\n\n';
  }

  // Related templates
  if (meta.relatedTemplates && meta.relatedTemplates.length > 0) {
    md += `## Related Examples\n\n`;
    md += meta.relatedTemplates.map(r => `- [${r}](./${r}.md)`).join('\n');
    md += '\n\n';
  }

  // Prerequisites
  if (meta.prerequisites && meta.prerequisites.length > 0) {
    md += `## Prerequisites\n\n`;
    md += `Before this example, you should understand:\n`;
    md += meta.prerequisites.map(p => `- [${p}](./${p}.md)`).join('\n');
    md += '\n\n';
  }

  // Next steps
  if (meta.nextSteps && meta.nextSteps.length > 0) {
    md += `## Next Steps\n\n`;
    md += `After this example, check out:\n`;
    md += meta.nextSteps.map(n => `- [${n}](./${n}.md)`).join('\n');
    md += '\n\n';
  }

  md += `---\n\n`;
  md += `*Generated with [Lab-Z](https://github.com/Lab-Z)*\n`;

  return md;
}

/**
 * Generate SUMMARY.md for GitBook
 */
function generateSummary(templates: TemplateMeta[]): string {
  let summary = `# Summary\n\n`;
  summary += `## Introduction\n\n`;
  summary += `* [Getting Started](README.md)\n\n`;

  // Group by category
  const byCategory = new Map<string, TemplateMeta[]>();
  for (const t of templates) {
    const list = byCategory.get(t.category) || [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  // Sort categories by order
  const sortedCategories = [...byCategory.keys()].sort((a, b) => {
    const aInfo = CATEGORIES.find(c => c.id === a);
    const bInfo = CATEGORIES.find(c => c.id === b);
    return (aInfo?.order || 99) - (bInfo?.order || 99);
  });

  for (const categoryId of sortedCategories) {
    const categoryInfo = CATEGORIES.find(c => c.id === categoryId);
    const categoryName = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.name}` : categoryId;
    const categoryTemplates = byCategory.get(categoryId) || [];

    summary += `## ${categoryName}\n\n`;

    // Sort by difficulty
    const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    categoryTemplates.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);

    for (const t of categoryTemplates) {
      summary += `* [${t.name}](examples/${t.id}.md)\n`;
    }
    summary += '\n';
  }

  return summary;
}

/**
 * Generate README for docs
 */
function generateReadme(): string {
  return `# FHEVM Example Hub

Welcome to the FHEVM Example Hub documentation. This guide provides comprehensive examples for building privacy-preserving smart contracts using Fully Homomorphic Encryption (FHE).

## Quick Start

\`\`\`bash
# Install the CLI globally
npm install -g labz

# Create a new project from a template
labz create counter my-first-fhe-project

# Navigate and run
cd my-first-fhe-project
npm install
npx hardhat test
\`\`\`

## Categories

| Category | Description |
|----------|-------------|
| **Basics** | Fundamental FHEVM concepts: counters, arithmetic, comparisons |
| **Encryption** | How to encrypt values and send them to contracts |
| **Decryption** | User and public decryption patterns |
| **Access Control** | FHE.allow, FHE.allowThis, and permission management |
| **Input Proofs** | Understanding and using input proofs for security |
| **Anti-Patterns** | Common mistakes and how to avoid them |
| **OpenZeppelin** | ERC7984 and other confidential contract patterns |
| **Advanced** | Complex patterns like auctions, voting, and more |

## Example Difficulty Levels

- 🟢 **Beginner** - Simple concepts, minimal code
- 🟡 **Intermediate** - More complex patterns, requires understanding of basics
- 🔴 **Advanced** - Complex implementations, multiple concepts combined

## Resources

- [FHEVM Documentation](https://docs.zama.org/protocol)
- [Zama GitHub](https://github.com/zama-ai)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)

---

*Generated with Lab-Z*
`;
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Generating GitBook documentation...\n');

  // Ensure output directory exists
  await fs.ensureDir(DOCS_OUTPUT_DIR);

  // Read all templates
  const templates = await readTemplates();
  console.log(`📚 Found ${templates.length} templates\n`);

  // Generate markdown for each template
  for (const meta of templates) {
    console.log(`  📝 ${meta.id} (${meta.category})`);

    const contractCode = await readContract(meta.id, meta.category);
    const markdown = generateTemplateMarkdown(meta, contractCode);

    const outputPath = path.join(DOCS_OUTPUT_DIR, `${meta.id}.md`);
    await fs.writeFile(outputPath, markdown);
  }

  // Generate SUMMARY.md
  const summary = generateSummary(templates);
  await fs.writeFile(path.join(ROOT_DIR, 'docs', 'SUMMARY.md'), summary);
  console.log('\n📖 Generated SUMMARY.md');

  // Generate README
  const readme = generateReadme();
  await fs.writeFile(path.join(ROOT_DIR, 'docs', 'README.md'), readme);
  console.log('📖 Generated README.md');

  console.log('\n✅ Documentation generated successfully!');
  console.log(`   Output: ${path.relative(process.cwd(), DOCS_OUTPUT_DIR)}`);
}

main().catch(console.error);
