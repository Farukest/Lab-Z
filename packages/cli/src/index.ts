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

// Default action (create)
program
  .argument('[template]', 'Template to generate')
  .argument('[project-name]', 'Name of the project')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (template, projectName, options) => {
    if (template) {
      // Delegate to create command
      const { executeCreate } = await import('./commands/create');
      await executeCreate(template, projectName, options);
    } else {
      program.help();
    }
  });

program.parse();
