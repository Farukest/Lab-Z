/**
 * List Command
 * List available templates with filtering
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createHub, CATEGORIES, DIFFICULTY_INFO, type Category, type Difficulty } from '@labz/core';
import { getTemplatesDir, formatInfo, formatError, printBanner } from '../utils';

export const listCommand = new Command('list')
  .description('List available FHEVM templates')
  .option('-c, --category <category>', 'Filter by category')
  .option('-d, --difficulty <level>', 'Filter by difficulty (beginner, intermediate, advanced)')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--json', 'Output as JSON')
  .option('--stats', 'Show statistics only')
  .action(async (options) => {
    await executeList(options);
  });

async function executeList(options: {
  category?: string;
  difficulty?: string;
  tag?: string;
  json?: boolean;
  stats?: boolean;
}) {
  if (!options.json) {
    printBanner();
  }

  const spinner = ora('Loading templates...').start();

  try {
    const templatesDir = getTemplatesDir();
    const hub = createHub(templatesDir);
    await hub.init();

    spinner.stop();

    // Get filtered templates
    let templates = hub.getAllTemplates();

    if (options.category) {
      templates = templates.filter((t) => t.category === options.category);
    }

    if (options.difficulty) {
      templates = templates.filter((t) => t.difficulty === options.difficulty);
    }

    if (options.tag) {
      templates = templates.filter((t) => t.tags.includes(options.tag));
    }

    // Stats mode
    if (options.stats) {
      const stats = hub.getStats();

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(formatInfo('\n📊 Template Statistics\n'));
      console.log(`Total templates: ${chalk.bold(stats.totalTemplates)}`);

      console.log(chalk.bold('\nBy Category:'));
      for (const cat of CATEGORIES) {
        const count = stats.byCategory[cat.id];
        if (count > 0) {
          console.log(`  ${cat.icon} ${cat.name.padEnd(15)} ${chalk.cyan(count)}`);
        }
      }

      console.log(chalk.bold('\nBy Difficulty:'));
      for (const [key, info] of Object.entries(DIFFICULTY_INFO)) {
        const count = stats.byDifficulty[key as Difficulty];
        const colorFn = key === 'beginner' ? chalk.green : key === 'intermediate' ? chalk.yellow : chalk.red;
        console.log(`  ${colorFn('●')} ${info.name.padEnd(15)} ${chalk.cyan(count)}`);
      }

      console.log(chalk.bold('\nPopular Tags:'));
      const tags = stats.allTags.slice(0, 10);
      console.log(`  ${tags.map((t) => chalk.cyan(t)).join(', ')}`);

      return;
    }

    // JSON mode
    if (options.json) {
      const output = templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        difficulty: t.difficulty,
        description: t.description,
        tags: t.tags,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Table mode
    if (templates.length === 0) {
      console.log(formatInfo('\nNo templates found matching your criteria.'));
      return;
    }

    console.log(formatInfo(`\n📦 Found ${templates.length} template(s)\n`));

    // Group by category
    const grouped = new Map<Category, typeof templates>();
    for (const template of templates) {
      const category = template.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(template);
    }

    // Print each category
    for (const category of CATEGORIES) {
      const categoryTemplates = grouped.get(category.id);
      if (!categoryTemplates || categoryTemplates.length === 0) continue;

      console.log(chalk.bold(`\n${category.icon} ${category.name}`));
      console.log(chalk.dim(category.description));
      console.log('');

      for (const template of categoryTemplates) {
        const diffColor = {
          beginner: chalk.green,
          intermediate: chalk.yellow,
          advanced: chalk.red,
        }[template.difficulty];

        const diffIcon = {
          beginner: '●',
          intermediate: '●●',
          advanced: '●●●',
        }[template.difficulty];

        console.log(
          `  ${chalk.cyan(template.id.padEnd(22))} ` +
          `${diffColor(diffIcon.padEnd(4))} ` +
          `${template.description}`
        );

        if (template.tags.length > 0) {
          console.log(chalk.dim(`    Tags: ${template.tags.join(', ')}`));
        }
      }
    }

    console.log(formatInfo('\n💡 Use `labz create <template-id>` to generate a project'));

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
