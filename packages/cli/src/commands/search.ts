/**
 * Search Command
 * Search templates by query with fuzzy matching
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createHub, type Category, type Difficulty } from '@labz/core';
import { getTemplatesDir, formatInfo, formatError, printBanner } from '../utils';

export const searchCommand = new Command('search')
  .description('Search FHEVM templates')
  .argument('<query>', 'Search query')
  .option('-c, --category <category>', 'Filter by category')
  .option('-d, --difficulty <level>', 'Filter by difficulty')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('--blocks', 'Include matching code blocks in results')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    await executeSearch(query, options);
  });

async function executeSearch(
  query: string,
  options: {
    category?: string;
    difficulty?: string;
    limit?: string;
    blocks?: boolean;
    json?: boolean;
  }
) {
  if (!options.json) {
    printBanner();
  }

  const spinner = ora('Searching...').start();

  try {
    const templatesDir = getTemplatesDir();
    const hub = createHub(templatesDir);
    await hub.init();

    const results = hub.search(query, {
      category: options.category as Category | undefined,
      difficulty: options.difficulty as Difficulty | undefined,
      limit: parseInt(options.limit || '10', 10),
      includeBlocks: options.blocks,
    });

    spinner.stop();

    if (results.length === 0) {
      console.log(formatInfo(`\nNo results found for "${query}"`));

      // Show suggestions
      const suggestions = hub.suggest(query, 5);
      if (suggestions.length > 0) {
        console.log(formatInfo('\nDid you mean:'));
        for (const suggestion of suggestions) {
          console.log(`  - ${chalk.cyan(suggestion)}`);
        }
      }
      return;
    }

    // JSON output
    if (options.json) {
      const output = results.map((r) => ({
        id: r.template.id,
        name: r.template.name,
        score: r.score,
        category: r.template.category,
        difficulty: r.template.difficulty,
        description: r.template.description,
        matchedBlocks: r.matchedBlocks?.map((b) => ({
          id: b.id,
          type: b.type,
          explanation: b.explanation,
        })),
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Pretty output
    console.log(formatInfo(`\n🔍 Found ${results.length} result(s) for "${chalk.cyan(query)}"\n`));

    for (const result of results) {
      const { template, score, matchedBlocks } = result;

      const diffColor = {
        beginner: chalk.green,
        intermediate: chalk.yellow,
        advanced: chalk.red,
      }[template.difficulty];

      const scoreBar = '█'.repeat(Math.round(score * 10)) + '░'.repeat(10 - Math.round(score * 10));

      console.log(chalk.bold(`${template.name}`));
      console.log(
        `  ID: ${chalk.cyan(template.id)} | ` +
        `Category: ${chalk.magenta(template.category)} | ` +
        `Difficulty: ${diffColor(template.difficulty)}`
      );
      console.log(`  ${template.description}`);
      console.log(chalk.dim(`  Relevance: [${scoreBar}] ${(score * 100).toFixed(0)}%`));

      // Show matched blocks if requested
      if (options.blocks && matchedBlocks && matchedBlocks.length > 0) {
        console.log(chalk.dim('  Matched blocks:'));
        for (const block of matchedBlocks.slice(0, 3)) {
          console.log(chalk.dim(`    - [${block.type}] ${block.explanation.slice(0, 60)}...`));
        }
      }

      console.log('');
    }

    console.log(formatInfo(`💡 Use ${chalk.cyan(`labz create <template-id>`)} to generate a project`));

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
