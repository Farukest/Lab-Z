/**
 * Create Command
 * Generate a new FHEVM example project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
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
  .action(async (template, projectName, options) => {
    await executeCreate(template, projectName, options);
  });

export async function executeCreate(
  templateId?: string,
  projectName?: string,
  options: { output?: string; yes?: boolean; list?: boolean } = {}
) {
  printBanner();

  const spinner = ora('Initializing Lab-Z...').start();

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

    spinner.succeed('Lab-Z initialized');

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

    // Interactive template selection if not provided
    let selectedTemplate = templateId;
    if (!selectedTemplate) {
      const templateChoices = templates.map((t) => ({
        name: `${t.name} (${t.difficulty}) - ${t.description}`,
        value: t.id,
      }));

      selectedTemplate = await select({
        message: 'Select a template:',
        choices: templateChoices,
      });
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
      finalProjectName = await input({
        message: 'Project name:',
        default: template.id,
      });
    }
    finalProjectName = finalProjectName || template.id;

    // Output directory (use override from process.argv if available)
    const outputDir = path.resolve(outputOverride || options.output || '.');

    // Confirm
    if (!forceYes) {
      console.log(formatInfo('\nProject configuration:'));
      console.log(`  Template:    ${chalk.cyan(template.name)}`);
      console.log(`  Project:     ${chalk.cyan(finalProjectName)}`);
      console.log(`  Output:      ${chalk.cyan(path.join(outputDir, finalProjectName))}`);
      console.log(`  Category:    ${chalk.cyan(template.category)}`);
      console.log(`  Difficulty:  ${chalk.cyan(template.difficulty)}`);

      const confirmed = await confirm({
        message: 'Create project?',
        default: true,
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

    // Print success message
    console.log(formatSuccess(`\n✨ Created ${finalProjectName} at ${result.outputPath}\n`));

    console.log(chalk.bold('Next steps:\n'));
    console.log(`  cd ${finalProjectName}`);
    console.log('  npm install');
    console.log('  npx hardhat test');
    console.log('');

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
