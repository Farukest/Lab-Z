/**
 * Test Command
 * Test a template in a temporary directory
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { createHub } from '@0xflydev/labz-core';
import { getTemplatesDir, getBaseTemplatePath, formatSuccess, formatError, formatInfo, printBanner } from '../utils';

export const testCommand = new Command('test')
  .description('Test a template in a temporary directory')
  .argument('<template>', 'Template ID to test')
  .option('--keep', 'Keep the temporary directory after test')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (template, options) => {
    await executeTest(template, options);
  });

export async function executeTest(
  templateId: string,
  options: { keep?: boolean; yes?: boolean } = {}
) {
  printBanner();

  const spinner = ora('Loading templates...').start();

  try {
    // Initialize hub
    const templatesDir = getTemplatesDir();
    const baseTemplatePath = getBaseTemplatePath();
    const hub = createHub(templatesDir, baseTemplatePath);
    await hub.init();

    // Verify template exists
    const template = hub.getTemplate(templateId);
    if (!template) {
      spinner.fail('Template not found');
      console.log(formatError(`Template "${templateId}" not found`));
      console.log(formatInfo('Run: labz list to see available templates'));
      process.exit(1);
    }

    spinner.succeed('Template found');

    // Create temp directory
    const tmpDir = path.join(os.tmpdir(), `labz-test-${templateId}-${Date.now()}`);
    const projectName = `test-${templateId}`;

    console.log('');
    console.log(chalk.bold('  Test Configuration'));
    console.log(chalk.dim('  ------------------'));
    console.log(`  Template:  ${chalk.cyan(template.name)}`);
    console.log(`  Temp dir:  ${chalk.dim(tmpDir)}`);
    console.log('');

    // Generate project
    const generateSpinner = ora('Generating project...').start();

    const result = await hub.generate({
      templateId,
      outputDir: tmpDir,
      projectName,
    });

    if (!result.success) {
      generateSpinner.fail('Failed to generate project');
      console.log(formatError(result.error || 'Unknown error'));
      process.exit(1);
    }

    generateSpinner.succeed('Project generated');

    const projectPath = result.outputPath!;

    // Install dependencies
    const installSpinner = ora('Installing dependencies (this may take a while)...').start();

    try {
      execSync('npm install', {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000, // 5 minutes
      });
      installSpinner.succeed('Dependencies installed');
    } catch (error: any) {
      installSpinner.fail('Failed to install dependencies');
      if (error.stderr) {
        console.log(chalk.red(error.stderr.toString().slice(0, 500)));
      }
      cleanup(tmpDir, options.keep);
      process.exit(1);
    }

    // Compile contracts
    const compileSpinner = ora('Compiling contracts...').start();
    try {
      execSync('npx hardhat compile', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 180000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      compileSpinner.succeed('Contracts compiled');
    } catch (error: any) {
      compileSpinner.fail('Compilation failed');
      if (error.stderr) {
        console.log(chalk.red(error.stderr.toString().slice(0, 500)));
      }
      cleanup(tmpDir, options.keep);
      process.exit(1);
    }

    // Success
    console.log('');
    console.log(formatSuccess(`Template "${templateId}" compiled successfully!`));

    // Cleanup or keep
    if (options.keep) {
      console.log(formatInfo(`Project kept at: ${projectPath}`));
      console.log(formatInfo('Run tests manually: cd ' + projectPath + ' && npx hardhat test'));
    } else {
      cleanup(tmpDir, false);
    }

  } catch (error) {
    spinner.fail('Error');
    console.log(formatError(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function cleanup(tmpDir: string, keep?: boolean) {
  if (!keep && fs.existsSync(tmpDir)) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
