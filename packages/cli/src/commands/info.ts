/**
 * Info Command
 * Show detailed information about a template
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { createHub, CATEGORIES, DIFFICULTY_INFO } from '@labz/core';
import { getTemplatesDir, formatInfo, formatError, printBanner } from '../utils';

export const infoCommand = new Command('info')
  .description('Show detailed information about a template')
  .argument('<template>', 'Template ID')
  .option('--code', 'Show contract code')
  .option('--test', 'Show test code')
  .option('--blocks', 'Show code block explanations')
  .option('--json', 'Output as JSON')
  .action(async (templateId, options) => {
    await executeInfo(templateId, options);
  });

async function executeInfo(
  templateId: string,
  options: {
    code?: boolean;
    test?: boolean;
    blocks?: boolean;
    json?: boolean;
  }
) {
  if (!options.json) {
    printBanner();
  }

  const spinner = ora('Loading template...').start();

  try {
    const templatesDir = getTemplatesDir();
    const hub = createHub(templatesDir);
    await hub.init();

    const template = hub.getTemplate(templateId);

    if (!template) {
      spinner.fail('Template not found');
      console.log(formatError(`Template "${templateId}" not found.`));

      // Suggest similar
      const results = hub.search(templateId, { limit: 3 });
      if (results.length > 0) {
        console.log(formatInfo('\nDid you mean:'));
        for (const r of results) {
          console.log(`  - ${chalk.cyan(r.template.id)}: ${r.template.description}`);
        }
      }
      process.exit(1);
    }

    spinner.stop();

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(template, null, 2));
      return;
    }

    // Get category info
    const categoryInfo = CATEGORIES.find((c) => c.id === template.category);
    const difficultyInfo = DIFFICULTY_INFO[template.difficulty];
    const diffColor = {
      beginner: chalk.green,
      intermediate: chalk.yellow,
      advanced: chalk.red,
    }[template.difficulty];

    // Header
    const header = boxen(
      `${chalk.bold.white(template.name)}\n\n${template.description}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    );
    console.log(header);

    // Metadata
    console.log(chalk.bold('📋 Details\n'));
    console.log(`  ID:          ${chalk.cyan(template.id)}`);
    console.log(`  Category:    ${categoryInfo?.icon || '📁'} ${chalk.magenta(template.category)}`);
    console.log(`  Difficulty:  ${diffColor('●')} ${diffColor(template.difficulty)}`);
    console.log(`  Tags:        ${template.tags.map((t) => chalk.cyan(t)).join(', ')}`);

    // Long description
    if (template.longDescription) {
      console.log(chalk.bold('\n📖 Description\n'));
      console.log(`  ${template.longDescription}`);
    }

    // Code blocks explanation
    if (options.blocks && template.blocks.length > 0) {
      console.log(chalk.bold('\n🧱 Code Blocks\n'));
      for (const block of template.blocks) {
        const typeColor = {
          import: chalk.blue,
          state: chalk.green,
          constructor: chalk.yellow,
          function: chalk.magenta,
          modifier: chalk.cyan,
          event: chalk.red,
          error: chalk.red,
          comment: chalk.gray,
        }[block.type] || chalk.white;

        console.log(`  ${typeColor(`[${block.type}]`)} Lines ${block.lines[0]}-${block.lines[1]}`);
        console.log(chalk.dim(`  ${block.explanation}`));
        if (block.searchTerms.length > 0) {
          console.log(chalk.dim(`  Keywords: ${block.searchTerms.join(', ')}`));
        }
        console.log('');
      }
    }

    // Contract code
    if (options.code) {
      console.log(chalk.bold('\n📄 Contract Code\n'));
      const lines = template.contractCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        console.log(chalk.dim(`${(i + 1).toString().padStart(3)} │ `) + highlightSolidity(lines[i]));
      }
    }

    // Test code
    if (options.test && template.testCode) {
      console.log(chalk.bold('\n🧪 Test Code\n'));
      const lines = template.testCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        console.log(chalk.dim(`${(i + 1).toString().padStart(3)} │ `) + lines[i]);
      }
    }

    // Related templates
    const related = hub.getRelated(templateId, 5);
    if (related.length > 0) {
      console.log(chalk.bold('\n🔗 Related Templates\n'));
      for (const r of related) {
        console.log(`  ${chalk.cyan(r.id.padEnd(20))} ${r.description}`);
      }
    }

    // Next steps
    if (template.nextSteps && template.nextSteps.length > 0) {
      console.log(chalk.bold('\n📚 Suggested Next Steps\n'));
      for (const next of template.nextSteps) {
        const nextTemplate = hub.getTemplate(next);
        if (nextTemplate) {
          console.log(`  → ${chalk.cyan(next)}: ${nextTemplate.description}`);
        } else {
          console.log(`  → ${chalk.cyan(next)}`);
        }
      }
    }

    // Usage
    console.log(chalk.bold('\n🚀 Quick Start\n'));
    console.log(`  ${chalk.cyan(`labz create ${template.id} my-${template.id}-app`)}`);
    console.log('');

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

/**
 * Basic Solidity syntax highlighting
 */
function highlightSolidity(line: string): string {
  return line
    .replace(/(\/\/.*$)/g, chalk.dim('$1'))
    .replace(/\b(pragma|solidity|import|contract|function|public|private|internal|external|view|pure|returns|memory|storage|calldata|event|emit|require|if|else|for|while|return|mapping|struct|enum|modifier|constructor)\b/g, chalk.magenta('$1'))
    .replace(/\b(uint\d*|int\d*|bool|address|bytes\d*|string|euint\d*|ebool|eaddress)\b/g, chalk.cyan('$1'))
    .replace(/\b(FHE)\b/g, chalk.yellow('$1'))
    .replace(/"([^"]*)"/g, chalk.green('"$1"'));
}
