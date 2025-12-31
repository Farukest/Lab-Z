/**
 * Build Command
 *
 * Create customized FHE contracts using the composable template system.
 * Supports base templates with optional feature modules.
 *
 * Usage:
 *   labz build counter my-counter
 *   labz build counter my-counter --with acl/transient --with admin/ownable
 *   labz build --list-bases
 *   labz build --list-modules
 *   labz build counter --list-modules
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { input, select, confirm, checkbox } from '@inquirer/prompts';
import { formatSuccess, formatError, formatInfo, printBanner, getTemplatesDir } from '../utils';

// Import composer functions
import {
  loadBaseTemplate,
  loadModule,
  loadAllBases,
  loadAllModules,
  getAvailableBases,
  getAvailableModules,
  merge,
  validate,
  generatePreview,
  formatValidationResult,
  type BaseTemplate,
  type Module,
  type MergeResult
} from '@0xflydev/labz-core/composer';

export const buildCommand = new Command('build')
  .description('Create customized FHE contracts with composable modules')
  .argument('[base]', 'Base template to use (e.g., counter, token, voting)')
  .argument('[project-name]', 'Name of the project')
  .option('-w, --with <modules...>', 'Feature modules to include (e.g., acl/transient)')
  .option('-t, --type <type>', 'Main encrypted type (euint8, euint32, euint64)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--list-bases', 'List available base templates')
  .option('--list-modules', 'List available modules')
  .option('--check', 'Check compatibility without generating')
  .option('--preview', 'Preview what will be generated')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-f, --force', 'Force generation without confirmation (alias for --yes)')
  .option('-i, --interactive', 'Interactive mode to select modules')
  .action(async (base, projectName, options) => {
    await executeBuild(base, projectName, options);
  });

export async function executeBuild(
  baseName?: string,
  projectName?: string,
  options: {
    with?: string[];
    type?: string;
    output?: string;
    listBases?: boolean;
    listModules?: boolean;
    check?: boolean;
    preview?: boolean;
    dryRun?: boolean;
    yes?: boolean;
    interactive?: boolean;
    force?: boolean;
  } = {}
) {
  printBanner();

  // Check for --yes or -y in process.argv as workaround for Commander issue
  const forceYes = options.yes || options.force || process.argv.includes('--yes') || process.argv.includes('-y') || process.env.CI === 'true';

  // Check for -o/--output in process.argv as workaround for Commander issue
  let outputOverride: string | undefined;
  const oIndex = process.argv.indexOf('-o');
  const outputIndex = process.argv.indexOf('--output');
  if (oIndex !== -1 && process.argv[oIndex + 1] && !process.argv[oIndex + 1].startsWith('-')) {
    outputOverride = process.argv[oIndex + 1];
  } else if (outputIndex !== -1 && process.argv[outputIndex + 1] && !process.argv[outputIndex + 1].startsWith('-')) {
    outputOverride = process.argv[outputIndex + 1];
  }

  // Debug: log options
  if (process.env.DEBUG) {
    console.log('DEBUG options:', JSON.stringify(options, null, 2));
    console.log('DEBUG forceYes:', forceYes);
  }

  const templatesDir = getTemplatesDir();

  // List bases mode
  if (options.listBases) {
    console.log(chalk.bold('\nAvailable base templates:\n'));
    const bases = getAvailableBases(templatesDir);

    if (bases.length === 0) {
      console.log(formatError('No base templates found.'));
      console.log(formatInfo(`Looking in: ${templatesDir}/buildable/projects`));
      return;
    }

    for (const baseName of bases) {
      try {
        const base = loadBaseTemplate(baseName, templatesDir);
        console.log(`  ${chalk.cyan(baseName.padEnd(20))} ${chalk.gray(base.description)}`);
      } catch {
        console.log(`  ${chalk.cyan(baseName.padEnd(20))} ${chalk.gray('(error loading)')}`);
      }
    }
    return;
  }

  // List modules mode
  if (options.listModules) {
    console.log(chalk.bold('\nAvailable modules:\n'));
    const modules = getAvailableModules(templatesDir);

    if (modules.length === 0) {
      console.log(formatError('No modules found.'));
      console.log(formatInfo(`Looking in: ${templatesDir}/buildable/modules`));
      return;
    }

    // Group by category
    const byCategory = new Map<string, string[]>();
    for (const moduleName of modules) {
      const category = moduleName.split('/')[0];
      const existing = byCategory.get(category) || [];
      existing.push(moduleName);
      byCategory.set(category, existing);
    }

    for (const [category, moduleNames] of byCategory) {
      console.log(chalk.bold(`\n  ${category.toUpperCase()}`));
      for (const moduleName of moduleNames) {
        try {
          const module = loadModule(moduleName, templatesDir);
          const exclusive = module.exclusive ? chalk.yellow(' (exclusive)') : '';
          console.log(`    ${chalk.cyan(moduleName.padEnd(25))} ${chalk.gray(module.description)}${exclusive}`);
        } catch {
          console.log(`    ${chalk.cyan(moduleName.padEnd(25))} ${chalk.gray('(error loading)')}`);
        }
      }
    }

    // If base is provided, also show compatible modules
    if (baseName) {
      console.log(chalk.bold(`\n\nModules compatible with ${chalk.cyan(baseName)}:\n`));
      try {
        const allModules = loadAllModules(templatesDir);
        const compatible = Object.values(allModules).filter(m =>
          m.compatibleWith.length === 0 || m.compatibleWith.includes(baseName)
        );

        for (const module of compatible) {
          console.log(`  ${chalk.green('✓')} ${chalk.cyan(module.name.padEnd(25))} ${chalk.gray(module.description)}`);
        }
      } catch (err) {
        console.log(formatError('Error checking compatibility'));
      }
    }
    return;
  }

  // Interactive base selection if not provided
  let selectedBase = baseName;
  if (!selectedBase) {
    const bases = getAvailableBases(templatesDir);

    if (bases.length === 0) {
      console.log(formatError('No base templates found.'));
      return;
    }

    const choices = await Promise.all(bases.map(async (name) => {
      try {
        const base = loadBaseTemplate(name, templatesDir);
        return {
          name: `${name} - ${base.description}`,
          value: name
        };
      } catch {
        return {
          name: `${name} - (error loading)`,
          value: name
        };
      }
    }));

    selectedBase = await select({
      message: 'Select a base template:',
      choices
    });
  }

  // Load base template
  let base: BaseTemplate;
  try {
    base = loadBaseTemplate(selectedBase, templatesDir);
  } catch (err) {
    console.log(formatError(`Failed to load base template: ${selectedBase}`));
    console.log(formatInfo((err as Error).message));
    return;
  }

  console.log(formatInfo(`\nBase: ${chalk.cyan(base.name)} - ${base.description}`));

  // Interactive module selection
  let selectedModules = options.with || [];

  if (options.interactive && selectedModules.length === 0) {
    const allModules = loadAllModules(templatesDir);
    const compatible = Object.values(allModules).filter(m =>
      m.compatibleWith.length === 0 || m.compatibleWith.includes(selectedBase!)
    );

    if (compatible.length > 0) {
      const choices = compatible.map(m => ({
        name: `${m.name} - ${m.description}${m.exclusive ? ' (exclusive)' : ''}`,
        value: m.name
      }));

      selectedModules = await checkbox({
        message: 'Select modules to include:',
        choices
      });
    }
  }

  // Load modules
  const modules: Module[] = [];
  for (const moduleName of selectedModules) {
    try {
      const module = loadModule(moduleName, templatesDir);
      modules.push(module);
      console.log(formatInfo(`  + Module: ${chalk.cyan(module.name)} - ${module.description}`));
    } catch (err) {
      console.log(formatError(`Failed to load module: ${moduleName}`));
      console.log(formatInfo((err as Error).message));
      return;
    }
  }

  // Check mode
  if (options.check) {
    console.log(chalk.bold('\nValidation Results:\n'));
    const validation = validate(base, modules, {
      typeParams: options.type ? { COUNTER_TYPE: options.type } : undefined
    });
    console.log(formatValidationResult(validation));
    return;
  }

  // Preview mode
  if (options.preview) {
    console.log(chalk.bold('\nPreview:\n'));
    const preview = generatePreview(base, modules, {
      projectName: projectName || 'MyContract'
    });
    console.log(preview);
    return;
  }

  // Project name
  let finalProjectName = projectName;
  if (!finalProjectName && !forceYes) {
    finalProjectName = await input({
      message: 'Project name:',
      default: base.name.charAt(0).toUpperCase() + base.name.slice(1)
    });
  }
  finalProjectName = finalProjectName || base.name.charAt(0).toUpperCase() + base.name.slice(1);

  // Output directory (use override from process.argv if available)
  const outputDir = path.resolve(outputOverride || options.output || '.', finalProjectName.toLowerCase());

  // Show config and confirm (unless -y or --dry-run)
  console.log(formatInfo('\nProject configuration:'));
  console.log(`  Base:      ${chalk.cyan(base.name)}`);
  console.log(`  Modules:   ${chalk.cyan(modules.length > 0 ? modules.map(m => m.name).join(', ') : 'none')}`);
  console.log(`  Project:   ${chalk.cyan(finalProjectName)}`);
  console.log(`  Output:    ${chalk.cyan(outputDir)}`);

  const skipConfirmation = forceYes || options.dryRun;
  if (!skipConfirmation) {
    const confirmed = await confirm({
      message: 'Create project?',
      default: true
    });

    if (!confirmed) {
      console.log(formatInfo('Cancelled'));
      return;
    }
  }

  // Merge and generate
  const spinner = ora('Generating project...').start();

  try {
    const result = merge(base, modules, {
      projectName: finalProjectName,
      typeParams: options.type ? { COUNTER_TYPE: options.type, EXTERNAL_TYPE: `external${options.type.charAt(0).toUpperCase()}${options.type.slice(1)}` } : undefined
    });

    if (!result.success) {
      spinner.fail('Validation failed');
      console.log(formatValidationResult(result.validation));
      return;
    }

    // Dry run mode
    if (options.dryRun) {
      spinner.succeed('Validation passed (dry run)');
      console.log(chalk.bold('\nFiles that would be generated:\n'));
      for (const filePath of Object.keys(result.files)) {
        console.log(`  ${chalk.green('+')} ${filePath}`);
      }
      return;
    }

    // Write files
    await writeProject(outputDir, result, base, templatesDir);

    spinner.succeed('Project generated successfully!');

    // Print success
    console.log(formatSuccess(`\n✨ Created ${finalProjectName} at ${outputDir}\n`));

    console.log(chalk.bold('Stats:'));
    console.log(`  Base template:  ${chalk.cyan(result.stats.baseTemplate)}`);
    console.log(`  Modules:        ${chalk.cyan(result.stats.modulesApplied.length > 0 ? result.stats.modulesApplied.join(', ') : 'none')}`);
    console.log(`  Slots used:     ${chalk.cyan(result.stats.slotsUsed.join(', ') || 'none')}`);

    console.log(chalk.bold('\nNext steps:\n'));
    console.log(`  cd ${finalProjectName.toLowerCase()}`);
    console.log('  npm install');
    console.log('  npx hardhat compile');
    console.log('  npx hardhat test');
    console.log('');

  } catch (err) {
    spinner.fail('Error generating project');
    console.log(formatError((err as Error).message));
  }
}

/**
 * Write project files to disk
 */
async function writeProject(
  outputDir: string,
  result: MergeResult,
  base: BaseTemplate,
  templatesDir: string
): Promise<void> {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy base hardhat template
  // base-template is at the same level as templates directory
  const baseHardhatDir = path.join(templatesDir, '..', 'base-template');
  if (fs.existsSync(baseHardhatDir)) {
    copyDirSync(baseHardhatDir, outputDir);
  }

  // Rename gitignore to .gitignore (npm publish excludes .gitignore)
  const gitignoreSrc = path.join(outputDir, 'gitignore');
  const gitignoreDest = path.join(outputDir, '.gitignore');
  if (fs.existsSync(gitignoreSrc)) {
    fs.renameSync(gitignoreSrc, gitignoreDest);
  }

  // Create directories
  const dirs = ['contracts', 'test', 'deploy'];
  for (const dir of dirs) {
    const dirPath = path.join(outputDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Write generated files
  for (const [filePath, content] of Object.entries(result.files)) {
    // Map template paths to actual paths
    let actualPath = filePath;

    // Handle .tmpl extension removal
    if (actualPath.endsWith('.tmpl')) {
      actualPath = actualPath.slice(0, -5);
    }

    // Handle contracts/Counter.sol -> contracts/ProjectName.sol
    if (actualPath.includes('Counter.sol')) {
      actualPath = actualPath.replace('Counter.sol', `${result.stats.baseTemplate.charAt(0).toUpperCase() + result.stats.baseTemplate.slice(1)}.sol`);
    }
    if (actualPath.includes('Counter.test.ts')) {
      actualPath = actualPath.replace('Counter.test.ts', `${result.stats.baseTemplate.charAt(0).toUpperCase() + result.stats.baseTemplate.slice(1)}.test.ts`);
    }

    const fullPath = path.join(outputDir, actualPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // Update package.json
  const pkgPath = path.join(outputDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.name = path.basename(outputDir);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
  }

  // Clean up .gitkeep files if folder has other files
  cleanupGitkeep(outputDir);
}

/**
 * Remove .gitkeep files from folders that have other files
 */
function cleanupGitkeep(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanupGitkeep(fullPath);
      // Check if this folder has .gitkeep and other files
      const files = fs.readdirSync(fullPath);
      if (files.includes('.gitkeep') && files.length > 1) {
        fs.unlinkSync(path.join(fullPath, '.gitkeep'));
      }
    }
  }
}

/**
 * Copy directory recursively
 */
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
