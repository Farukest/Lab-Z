#!/usr/bin/env node

/**
 * Lab-Z CLI
 * FHE Smart Contract Generator
 */

import { Command } from 'commander';
import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { infoCommand } from './commands/info';
import { composeCommand } from './commands/compose';
import { buildCommand } from './commands/build';
import { doctorCommand } from './commands/doctor';
import { deployCommand } from './commands/deploy';
import { testCommand } from './commands/test';

const program = new Command();

program
  .name('labz')
  .description('FHE smart contract generator')
  .version('1.0.0');

// Register commands
program.addCommand(createCommand);
program.addCommand(buildCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(infoCommand);
program.addCommand(composeCommand);
program.addCommand(doctorCommand);
program.addCommand(deployCommand);
program.addCommand(testCommand);

// Default action (create) - for running `labz <template>` without 'create' keyword
// Note: For --add and --merge, use `labz create` command directly
program
  .argument('[template]', 'Template ID or comma-separated list')
  .argument('[projectName]', 'Project name (optional)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-i, --interactive', 'Interactive mode with category selection')
  .option('--git', 'Initialize git repository')
  .option('--install', 'Run npm install after creation')
  .option('--open', 'Open project in VS Code')
  .action(async (template, projectName, options) => {
    if (template || options.interactive) {
      // Delegate to create command
      const { executeCreate } = await import('./commands/create');
      await executeCreate(template, projectName, options);
    } else {
      program.help();
    }
  });

program.parse();
