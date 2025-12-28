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
  .argument('[template]', 'Template(s) to generate - comma-separated, last is project name')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (template, options) => {
    if (template) {
      // Delegate to create command
      const { executeCreate } = await import('./commands/create');
      await executeCreate(template, options);
    } else {
      program.help();
    }
  });

program.parse();
