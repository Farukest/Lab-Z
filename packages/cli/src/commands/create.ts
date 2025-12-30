/**
 * Create Command
 * Generate a new FHEVM example project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync, spawn } from 'child_process';
import { input, select, confirm } from '@inquirer/prompts';
import { createHub, type Category, CATEGORIES } from '@0xflydev/labz-core';
import { getTemplatesDir, getBaseTemplatePath, formatSuccess, formatError, formatInfo, printBanner } from '../utils';

export const createCommand = new Command('create')
  .description('Create a new FHEVM example project')
  .argument('[template]', 'Template ID or comma-separated list')
  .argument('[projectName]', 'Project name (optional, defaults to template id)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-l, --list', 'List available templates')
  .option('-i, --interactive', 'Interactive mode with category selection')
  .option('--git', 'Initialize git repository')
  .option('--install', 'Run npm install after creation')
  .option('--open', 'Open project in VS Code')
  .option('--add <templates>', 'Add more templates (comma-separated)', collectAddOptions, [])
  .option('-m, --merge', 'Merge all templates into single files')
  .action(async (template, projectName, options) => {
    await executeCreate(template, projectName, options);
  });

// Collect multiple --add options
function collectAddOptions(value: string, previous: string[]): string[] {
  return previous.concat(value.split(',').map(s => s.trim()).filter(Boolean));
}

export async function executeCreate(
  templateArg?: string,
  projectNameArg?: string,
  options: { output?: string; yes?: boolean; list?: boolean; interactive?: boolean; git?: boolean; install?: boolean; open?: boolean; add?: string[]; merge?: boolean } = {}
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

    // Check for --merge or -m in process.argv
    const shouldMerge = options.merge || process.argv.includes('--merge') || process.argv.includes('-m');

    // Check for --interactive flag early (needed for arg parsing)
    const isInteractive = options.interactive || process.argv.includes('--interactive') || process.argv.includes('-i');

    // Parse templates from first argument (comma-separated, spaces ignored)
    let templateIds: string[] = [];
    let projectName: string | undefined = projectNameArg;

    // Add templates from --add flag (could be string or array)
    let addTemplates: string[] = [];
    if (options.add) {
      if (Array.isArray(options.add)) {
        addTemplates = options.add;
      } else {
        // String - split by comma
        addTemplates = (options.add as string).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const hasAddFlag = addTemplates.length > 0;

    if (templateArg) {
      // Parse comma-separated templates (ignore spaces)
      const parts = templateArg.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        if (parts.length === 1 && !hasAddFlag) {
          // Single template: labz create counter [my-counter]
          // In interactive mode, first arg is project name (not template)
          if (isInteractive && !projectName) {
            projectName = parts[0];
          }
          templateIds = [];
          // projectName already set from projectNameArg if provided
          // If not provided, will be set later to template id
        } else if (hasAddFlag) {
          // With --add: all parts from first arg are templates
          templateIds = parts;
          // Add templates from --add
          templateIds = [...templateIds, ...addTemplates];
          // projectName from second argument or last template id
        } else {
          // Multi-template comma syntax: labz create counter,add,my-project
          // Last part is project name, rest are templates
          if (!projectName) {
            projectName = parts.pop();
          }
          templateIds = parts;
        }
      }
    } else if (hasAddFlag) {
      // No first arg, only --add: last item is project name if no projectNameArg
      if (!projectName) {
        projectName = addTemplates.pop();
      }
      templateIds = addTemplates;
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

    // Determine if this is multi-template mode
    const isMultiTemplate = templateIds.length > 0;

    // MULTI-TEMPLATE MODE
    if (isMultiTemplate) {
      // Verify all templates exist
      const validatedTemplates: Array<{ id: string; template: ReturnType<typeof hub.getTemplate> }> = [];
      for (const tid of templateIds) {
        const t = hub.getTemplate(tid);
        if (!t) {
          console.log(formatError(`Template not found: ${tid}`));
          console.log(formatInfo('Run with --list to see available templates'));
          process.exit(1);
        }
        validatedTemplates.push({ id: tid, template: t });
      }

      // Use project name or default to first template id
      const finalProjectName = projectName || templateIds[0];
      const outputDir = path.resolve(outputOverride || options.output || '.');
      const projectPath = path.join(outputDir, finalProjectName);

      // Confirm
      if (!forceYes) {
        console.log(chalk.bold('  Multi-Template Project'));
        console.log(chalk.dim('  ----------------------'));
        console.log(`  Templates:   ${chalk.cyan(templateIds.join(', '))}`);
        console.log(`  Project:     ${chalk.cyan(finalProjectName)}`);
        console.log(`  Output:      ${chalk.cyan(projectPath)}`);
        console.log(`  Mode:        ${shouldMerge ? chalk.yellow('Merged') : chalk.green('Separate files')}`);
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
      const generateSpinner = ora('Generating multi-template project...').start();

      try {
        // Check if output directory already exists
        if (await fs.pathExists(projectPath)) {
          generateSpinner.fail('Failed to generate project');
          console.log(formatError(`Directory already exists: ${projectPath}`));
          process.exit(1);
        }

        // Copy base template
        const baseTemplatePath = getBaseTemplatePath();
        await fs.copy(baseTemplatePath, projectPath);

        // Remove .gitkeep files (no longer needed after copying)
        await removeGitkeepFiles(projectPath);

        // Prepare directories
        const contractDir = path.join(projectPath, 'contracts');
        const testDir = path.join(projectPath, 'test');
        await fs.ensureDir(contractDir);
        await fs.ensureDir(testDir);

        if (shouldMerge) {
          // MERGE MODE: Combine all contracts and tests into single files
          let mergedContracts = '';
          let mergedTests = '';
          const importSet = new Set<string>();
          const testImportSet = new Set<string>();

          for (const { template } of validatedTemplates) {
            if (!template) continue;

            // Extract and dedupe imports from contract
            const contractLines = template.contractCode.split('\n');
            const contractImports: string[] = [];
            const contractBody: string[] = [];

            for (const line of contractLines) {
              if (line.trim().startsWith('import ') || line.trim().startsWith('// SPDX')) {
                if (!importSet.has(line.trim())) {
                  importSet.add(line.trim());
                  contractImports.push(line);
                }
              } else if (line.trim().startsWith('pragma ')) {
                if (!importSet.has(line.trim())) {
                  importSet.add(line.trim());
                  contractImports.push(line);
                }
              } else {
                contractBody.push(line);
              }
            }

            if (mergedContracts === '') {
              mergedContracts = contractImports.join('\n') + '\n\n';
            }
            mergedContracts += contractBody.join('\n') + '\n\n';

            // Extract and dedupe imports from test
            if (template.testCode) {
              const testLines = template.testCode.split('\n');
              const testImports: string[] = [];
              const testBody: string[] = [];

              for (const line of testLines) {
                if (line.trim().startsWith('import ')) {
                  if (!testImportSet.has(line.trim())) {
                    testImportSet.add(line.trim());
                    testImports.push(line);
                  }
                } else {
                  testBody.push(line);
                }
              }

              if (mergedTests === '') {
                mergedTests = testImports.join('\n') + '\n\n';
              }
              mergedTests += testBody.join('\n') + '\n\n';
            }
          }

          // Write merged files
          const contractName = finalProjectName.charAt(0).toUpperCase() + finalProjectName.slice(1).replace(/-/g, '');
          await fs.writeFile(path.join(contractDir, `${contractName}.sol`), mergedContracts.trim());
          if (mergedTests) {
            await fs.writeFile(path.join(testDir, `${contractName}.test.ts`), mergedTests.trim());
          }
        } else {
          // SEPARATE MODE: Each template gets its own files
          for (const { template } of validatedTemplates) {
            if (!template) continue;

            // Extract contract name
            const contractMatch = template.contractCode.match(/contract\s+(\w+)/);
            const contractName = contractMatch ? contractMatch[1] : 'Contract';

            // Write contract file
            await fs.writeFile(
              path.join(contractDir, `${contractName}.sol`),
              template.contractCode
            );

            // Write test file
            if (template.testCode) {
              await fs.writeFile(
                path.join(testDir, `${contractName}.test.ts`),
                template.testCode
              );
            }
          }
        }

        // Update package.json
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath);
          packageJson.name = finalProjectName;
          packageJson.description = `Multi-template project: ${templateIds.join(', ')}`;
          await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }

        // Generate README
        const readmeContent = generateMultiTemplateReadme(finalProjectName, validatedTemplates.map(v => v.template!), shouldMerge);
        await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);

        generateSpinner.succeed('Project generated successfully!');

        // Post-create actions
        await handlePostCreate(projectPath, templateIds.join(','), options, forceYes);

        // Print success
        console.log(formatSuccess(`\n  Created ${finalProjectName} at ${projectPath}\n`));
        console.log(chalk.bold('Next steps:\n'));
        console.log(`  cd ${finalProjectName}`);
        console.log('  npm install');
        console.log('  npx hardhat test');
        console.log('');

      } catch (error) {
        generateSpinner.fail('Failed to generate project');
        console.log(formatError(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      return;
    }

    // SINGLE TEMPLATE MODE (existing behavior)
    let selectedTemplate: string | undefined;

    // Use templateArg as template if provided (but not in interactive mode)
    if (templateArg && !templateArg.includes(',') && !isInteractive) {
      selectedTemplate = templateArg;
    }

    // If no template selected, use interactive or prompt selection
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
    const template = hub.getTemplate(selectedTemplate!);
    if (!template) {
      console.log(formatError(`Template not found: ${selectedTemplate}`));
      console.log(formatInfo('Run with --list to see available templates'));
      process.exit(1);
    }

    // Determine project name
    let finalProjectName = projectName || template.id;

    // Only ask for project name if not provided and not in forceYes mode
    if (!projectName && !forceYes) {
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
      templateId: selectedTemplate!,
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

    // Post-create actions
    await handlePostCreate(projectPath, selectedTemplate!, options, forceYes);

    // Print success summary
    printSuccessSummary({
      projectName: finalProjectName,
      templateId: selectedTemplate!,
      category: template.category,
      path: result.outputPath!,
      related: hub.getRelated(selectedTemplate!, 3).map(r => r.id),
    });

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

/**
 * Print success summary in a bordered table format
 */
function printSuccessSummary(opts: {
  projectName: string;
  templateId: string;
  category: string;
  path: string;
  related: string[];
}): void {
  const width = 54;
  const top = chalk.gray('┌' + '─'.repeat(width) + '┐');
  const mid = chalk.gray('├' + '─'.repeat(width) + '┤');
  const bot = chalk.gray('└' + '─'.repeat(width) + '┘');
  const side = chalk.gray('│');

  const pad = (str: string, len: number) => str + ' '.repeat(Math.max(0, len - str.length));

  console.log('');
  console.log(top);
  console.log(`${side}  ${chalk.green.bold('✓ Project Created')}${' '.repeat(width - 19)}${side}`);
  console.log(mid);
  console.log(`${side}  ${chalk.gray('Template')}     ${pad(chalk.cyan(opts.templateId), width - 16)}${side}`);
  console.log(`${side}  ${chalk.gray('Project')}      ${pad(chalk.bold(opts.projectName), width - 16)}${side}`);
  console.log(`${side}  ${chalk.gray('Category')}     ${pad(opts.category, width - 16)}${side}`);
  console.log(mid);
  console.log(`${side}  ${chalk.bold('Next Steps')}${' '.repeat(width - 13)}${side}`);
  console.log(`${side}${' '.repeat(width)}${side}`);
  console.log(`${side}  ${chalk.yellow('1.')} cd ${opts.projectName}${' '.repeat(Math.max(0, width - 8 - opts.projectName.length))}${side}`);
  console.log(`${side}  ${chalk.yellow('2.')} npm install${' '.repeat(width - 16)}${side}`);
  console.log(`${side}  ${chalk.yellow('3.')} npx hardhat test${' '.repeat(width - 21)}${side}`);
  console.log(bot);

  if (opts.related.length > 0) {
    console.log('');
    console.log(chalk.gray(`  See also: ${opts.related.join(', ')}`));
  }
  console.log('');
}

/**
 * Handle post-create actions (git, npm install, VS Code)
 */
async function handlePostCreate(
  projectPath: string,
  templateInfo: string,
  options: { git?: boolean; install?: boolean; open?: boolean },
  forceYes: boolean
): Promise<void> {
  const shouldGit = options.git || process.argv.includes('--git');
  const shouldInstall = options.install || process.argv.includes('--install');
  const shouldOpen = options.open || process.argv.includes('--open');

  // Git init
  if (shouldGit) {
    const gitSpinner = ora('Initializing git repository...').start();
    try {
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
      execSync(`git commit -m "Initial commit - Lab-Z template: ${templateInfo}"`, { cwd: projectPath, stdio: 'pipe' });
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
}

/**
 * Remove .gitkeep files from a directory recursively
 */
async function removeGitkeepFiles(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await removeGitkeepFiles(fullPath);
    } else if (entry.name === '.gitkeep') {
      await fs.remove(fullPath);
    }
  }
}

/**
 * Generate README for multi-template projects
 */
function generateMultiTemplateReadme(
  projectName: string,
  templates: Array<{ id: string; name: string; description: string; difficulty: string; category: string; contractCode: string }>,
  isMerged: boolean
): string {
  let readme = `# ${projectName}

Multi-template FHEVM project generated with Lab-Z.

## Included Templates

`;

  for (const t of templates) {
    const difficultyEmoji = {
      beginner: '🟢',
      intermediate: '🟡',
      advanced: '🔴',
    }[t.difficulty] || '🟡';

    readme += `### ${t.name}

${difficultyEmoji} **${t.difficulty}** | **${t.category}**

${t.description}

`;
  }

  readme += `## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run tests
npx hardhat test

# Compile contracts
npx hardhat compile
\`\`\`

## Project Structure

`;

  if (isMerged) {
    readme += `This project uses **merged mode** - all contracts are combined into a single file.

\`\`\`
contracts/
  ${projectName.charAt(0).toUpperCase() + projectName.slice(1).replace(/-/g, '')}.sol  # All contracts merged
test/
  ${projectName.charAt(0).toUpperCase() + projectName.slice(1).replace(/-/g, '')}.test.ts  # All tests merged
\`\`\`
`;
  } else {
    readme += `This project uses **separate mode** - each template has its own files.

\`\`\`
contracts/
`;
    for (const t of templates) {
      const contractMatch = t.contractCode.match(/contract\s+(\w+)/);
      const contractName = contractMatch ? contractMatch[1] : 'Contract';
      readme += `  ${contractName}.sol
`;
    }
    readme += `test/
`;
    for (const t of templates) {
      const contractMatch = t.contractCode.match(/contract\s+(\w+)/);
      const contractName = contractMatch ? contractMatch[1] : 'Contract';
      readme += `  ${contractName}.test.ts
`;
    }
    readme += `\`\`\`
`;
  }

  readme += `
---

Generated with [Lab-Z](https://github.com/Lab-Z)
`;

  return readme;
}
