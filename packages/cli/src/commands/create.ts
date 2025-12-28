/**
 * Create Command
 * Generate a new FHEVM example project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { input, select, confirm } from '@inquirer/prompts';
import { createHub, type Category, CATEGORIES } from '@0xflydev/labz-core';
import { getTemplatesDir, getBaseTemplatePath, formatSuccess, formatError, formatInfo, printBanner } from '../utils';

export const createCommand = new Command('create')
  .description('Create a new FHEVM example project')
  .argument('[template]', 'Template ID to use')
  .argument('[project-name]', 'Name of the project')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-l, --list', 'List available templates')
  .option('-i, --interactive', 'Interactive mode with category selection')
  .option('--git', 'Initialize git repository')
  .option('--install', 'Run npm install after creation')
  .option('--open', 'Open project in VS Code')
  .action(async (template, projectName, options) => {
    await executeCreate(template, projectName, options);
  });

export async function executeCreate(
  templateId?: string,
  projectName?: string,
  options: { output?: string; yes?: boolean; list?: boolean; interactive?: boolean; git?: boolean; install?: boolean; open?: boolean } = {}
) {
  printBanner();

  const spinner = ora('Loading templates...').start();

  try {
    // Check for --yes or -y in process.argv as workaround for Commander issue
    const forceYes = options.yes || process.argv.includes('--yes') || process.argv.includes('-y') || process.env.CI === 'true';

    // Check for -o/--output in process.argv as workaround for Commander issue
    let outputOverride: string | undefined;
    const oIndex = process.argv.indexOf('-o');
    const outputIndex = process.argv.indexOf('--output');
    if (oIndex !== -1 && process.argv[oIndex + 1] && !process.argv[oIndex + 1].startsWith('-')) {
      outputOverride = process.argv[oIndex + 1];
    } else if (outputIndex !== -1 && process.argv[outputIndex + 1] && !process.argv[outputIndex + 1].startsWith('-')) {
      outputOverride = process.argv[outputIndex + 1];
    }

    // Initialize hub
    const templatesDir = getTemplatesDir();
    const baseTemplatePath = getBaseTemplatePath();
    const hub = createHub(templatesDir, baseTemplatePath);
    await hub.init();

    spinner.succeed('Ready\n');

    const templates = hub.getAllTemplates();

    if (templates.length === 0) {
      console.log(formatError('No templates found. Please check your templates directory.'));
      process.exit(1);
    }

    // List mode
    if (options.list) {
      console.log(formatInfo('\nAvailable templates:\n'));
      const stats = hub.getStats();

      for (const category of CATEGORIES) {
        const categoryTemplates = hub.getTemplatesByCategory(category.id);
        if (categoryTemplates.length > 0) {
          console.log(chalk.bold(`\n${category.icon} ${category.name}`));
          for (const t of categoryTemplates) {
            const diffColor = {
              beginner: chalk.green,
              intermediate: chalk.yellow,
              advanced: chalk.red,
            }[t.difficulty];
            console.log(`  ${chalk.cyan(t.id.padEnd(20))} ${diffColor(`[${t.difficulty}]`.padEnd(15))} ${t.description}`);
          }
        }
      }
      return;
    }

    // Check for --interactive flag
    const isInteractive = options.interactive || process.argv.includes('--interactive') || process.argv.includes('-i');

    // Interactive template selection if not provided
    let selectedTemplate = templateId;
    if (!selectedTemplate) {
      if (isInteractive) {
        // Interactive mode: First select category, then template
        const availableCategories = CATEGORIES.filter((cat) => hub.getTemplatesByCategory(cat.id).length > 0);
        const maxNameLen = Math.max(...availableCategories.map((c) => c.name.length));
        const categoryChoices = availableCategories.map((cat, idx) => {
          const count = hub.getTemplatesByCategory(cat.id).length;
          const num = String(idx + 1).padStart(2, ' ');
          const name = cat.name.padEnd(maxNameLen, ' ');
          return {
            name: `${num}. ${name}  (${count})`,
            value: cat.id,
          };
        });

        // Loop for back navigation
        let selectedCategoryId: string | null = null;
        while (!selectedTemplate) {
          // Category selection
          if (!selectedCategoryId) {
            selectedCategoryId = await select({
              message: chalk.hex('#D97706')('Choose Category'),
              choices: categoryChoices,
              theme: {
                prefix: { idle: chalk.hex('#E5A00D')('?'), done: '' },
                style: {
                  message: (text: string, status: string) => status === 'done' ? '' : text,
                  answer: () => '',
                },
              },
            });

            // Clear the prompt line
            process.stdout.write('\x1b[1A\x1b[2K');
            const selectedCat = availableCategories.find((c) => c.id === selectedCategoryId);
            console.log(`  ${chalk.green('Selected Category:')} ${chalk.greenBright(selectedCat?.name)}`);
            console.log('');
            console.log('');
            console.log('');
          }

          // Template selection with Back option
          const categoryTemplates = hub.getTemplatesByCategory(selectedCategoryId as Category);
          const maxTemplateLen = Math.max(...categoryTemplates.map((t) => t.name.length));
          const templateChoices = [
            { name: chalk.yellow('  <- Back'), value: '__BACK__' },
            ...categoryTemplates.map((t, idx) => {
              const num = String(idx + 1).padStart(2, ' ');
              const name = t.name.padEnd(maxTemplateLen, ' ');
              return {
                name: `${num}. ${name}  ${t.description}`,
                value: t.id,
              };
            }),
          ];

          const templateSelection = await select({
            message: chalk.cyan('Choose Template'),
            choices: templateChoices,
            theme: {
              prefix: { idle: chalk.cyanBright('?'), done: '' },
              style: {
                message: (text: string, status: string) => status === 'done' ? '' : text,
                answer: () => '',
              },
            },
          });

          if (templateSelection === '__BACK__') {
            console.log('');
            selectedCategoryId = null;
          } else {
            selectedTemplate = templateSelection;
            // Clear the prompt line
            process.stdout.write('\x1b[1A\x1b[2K');
            const selectedTmpl = categoryTemplates.find((t) => t.id === selectedTemplate);
            console.log(`  ${chalk.green('Selected Template:')} ${chalk.greenBright(selectedTmpl?.name)}`);
            console.log('');
            console.log('');
            console.log('');
          }
        }
      } else {
        // Normal mode: show all templates
        const templateChoices = templates.map((t) => ({
          name: `${t.name} (${t.difficulty}) - ${t.description}`,
          value: t.id,
        }));

        selectedTemplate = await select({
          message: 'Select a template:',
          choices: templateChoices,
        });
      }
    }

    // Verify template exists
    const template = hub.getTemplate(selectedTemplate);
    if (!template) {
      console.log(formatError(`Template not found: ${selectedTemplate}`));
      console.log(formatInfo('Run with --list to see available templates'));
      process.exit(1);
    }

    // Interactive project name if not provided
    let finalProjectName = projectName;
    if (!finalProjectName && !forceYes) {
      const useDefault = await confirm({
        message: `Use default name ${chalk.greenBright(template.id)}?`,
        default: true,
        theme: {
          prefix: { idle: chalk.hex('#22C55E')('?'), done: '' },
          style: {
            message: (text: string, status: string) => status === 'done' ? '' : text,
            answer: () => '',
          },
        },
      });

      // Clear the prompt line
      process.stdout.write('\x1b[1A\x1b[2K');

      if (!useDefault) {
        finalProjectName = await input({
          message: 'Enter project name:',
          theme: { prefix: { idle: chalk.hex('#22C55E')('>') } },
        });
        // Clear input prompt line
        process.stdout.write('\x1b[1A\x1b[2K');
      } else {
        finalProjectName = template.id;
      }

      // Show selected project name like category/template
      console.log('');
      console.log(`  ${chalk.green('Selected Project:')} ${chalk.greenBright(finalProjectName)}`);
      console.log('');
      console.log('');
      console.log('');
    }
    finalProjectName = finalProjectName || template.id;

    // Output directory (use override from process.argv if available)
    const outputDir = path.resolve(outputOverride || options.output || '.');

    // Confirm
    if (!forceYes) {
      console.log(chalk.bold('  Project Summary'));
      console.log(chalk.dim('  ---------------'));
      console.log(`  Template:    ${chalk.cyan(template.name)}`);
      console.log(`  Project:     ${chalk.cyan(finalProjectName)}`);
      console.log(`  Output:      ${chalk.cyan(path.join(outputDir, finalProjectName))}`);
      console.log('');

      const confirmed = await confirm({
        message: 'Create this project?',
        default: true,
        theme: { prefix: { idle: chalk.hex('#22C55E')('?') } },
      });

      if (!confirmed) {
        console.log(formatInfo('Cancelled'));
        return;
      }
    }

    // Generate project
    const generateSpinner = ora('Generating project...').start();

    const result = await hub.generate({
      templateId: selectedTemplate,
      outputDir,
      projectName: finalProjectName,
    });

    if (!result.success) {
      generateSpinner.fail('Failed to generate project');
      console.log(formatError(result.error || 'Unknown error'));
      process.exit(1);
    }

    generateSpinner.succeed('Project generated successfully!');

    const projectPath = result.outputPath!;

    // Check for post-create flags
    const shouldGit = options.git || process.argv.includes('--git');
    const shouldInstall = options.install || process.argv.includes('--install');
    const shouldOpen = options.open || process.argv.includes('--open');

    // Git init
    if (shouldGit) {
      const gitSpinner = ora('Initializing git repository...').start();
      try {
        execSync('git init', { cwd: projectPath, stdio: 'pipe' });
        execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
        execSync('git commit -m "Initial commit - Lab-Z template: ' + selectedTemplate + '"', { cwd: projectPath, stdio: 'pipe' });
        gitSpinner.succeed('Git repository initialized');
      } catch (error) {
        gitSpinner.fail('Failed to initialize git');
      }
    }

    // npm install
    if (shouldInstall) {
      const installSpinner = ora('Installing dependencies...').start();
      try {
        execSync('npm install', { cwd: projectPath, stdio: 'pipe' });
        installSpinner.succeed('Dependencies installed');
      } catch (error) {
        installSpinner.fail('Failed to install dependencies');
      }
    }

    // Open in VS Code
    if (shouldOpen) {
      const openSpinner = ora('Opening in VS Code...').start();
      try {
        execSync(`code "${projectPath}"`, { stdio: 'pipe' });
        openSpinner.succeed('Opened in VS Code');
      } catch (error) {
        openSpinner.fail('Failed to open VS Code (is it installed?)');
      }
    }

    // Print success message
    console.log(formatSuccess(`\n  Created ${finalProjectName} at ${result.outputPath}\n`));

    // Show next steps (skip steps that were already done)
    const nextSteps: string[] = [];
    if (!shouldInstall || !shouldOpen) {
      nextSteps.push(`cd ${finalProjectName}`);
    }
    if (!shouldInstall) {
      nextSteps.push('npm install');
    }
    nextSteps.push('npx hardhat test');

    if (nextSteps.length > 0) {
      console.log(chalk.bold('Next steps:\n'));
      for (const step of nextSteps) {
        console.log(`  ${step}`);
      }
      console.log('');
    }

    // Show related templates
    const related = hub.getRelated(selectedTemplate, 3);
    if (related.length > 0) {
      console.log(formatInfo('Related templates:'));
      for (const r of related) {
        console.log(`  - ${chalk.cyan(r.id)}: ${r.description}`);
      }
    }

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
