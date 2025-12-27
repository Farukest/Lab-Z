/**
 * Compose Command
 *
 * Interactive visual contract builder in the terminal
 */

import { Command } from 'commander';
import * as readline from 'readline';
import { createHub } from '@labz/core';
import {
  blocks,
  searchBlocks,
  getBlocksByCategory,
  getCategories,
  validateDrop,
  generateProject,
  createEmptyProject,
  type Block,
  type ProjectState,
  type ProjectFunction,
  type ProjectBlock,
  type ZoneType
} from '@labz/core/blocks';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

class ComposerSession {
  private project: ProjectState;
  private selectedFunctionId: string | null = null;

  constructor(name: string) {
    this.project = createEmptyProject(name);
  }

  private printHeader() {
    console.clear();
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan(`║  FHEVM Visual Contract Composer                            ║`));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));
  }

  private printStatus() {
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.bold(`Contract: ${chalk.cyan(this.project.name)}`));
    console.log(chalk.gray(`Imports: ${this.project.imports.length} | State: ${this.project.stateVariables.length} | Functions: ${this.project.functions.length}`));
    console.log(chalk.gray('─'.repeat(60)));
  }

  private printCommands() {
    console.log('\n' + chalk.bold('Commands:'));
    console.log(chalk.yellow('  /add <block>') + '     - Add a block (e.g., /add FHE.add)');
    console.log(chalk.yellow('  /search <query>') + '  - Search for blocks');
    console.log(chalk.yellow('  /list [category]') + ' - List blocks by category');
    console.log(chalk.yellow('  /func <name>') + '     - Add/select function');
    console.log(chalk.yellow('  /state <type>') + '    - Add state variable');
    console.log(chalk.yellow('  /preview') + '         - Preview generated code');
    console.log(chalk.yellow('  /save <dir>') + '      - Save project');
    console.log(chalk.yellow('  /clear') + '           - Clear current function');
    console.log(chalk.yellow('  /help') + '            - Show help');
    console.log(chalk.yellow('  /exit') + '            - Exit composer\n');
  }

  private printBlocks(blockList: Block[], limit = 10) {
    const display = blockList.slice(0, limit);
    for (const block of display) {
      console.log(`  ${chalk.cyan(block.name.padEnd(25))} ${chalk.gray(block.description.slice(0, 40))}`);
    }
    if (blockList.length > limit) {
      console.log(chalk.gray(`  ... and ${blockList.length - limit} more`));
    }
  }

  private findBlockByName(query: string): Block | undefined {
    // Try exact match first
    const exact = blocks.find(b =>
      b.name.toLowerCase() === query.toLowerCase() ||
      b.id.toLowerCase() === query.toLowerCase()
    );
    if (exact) return exact;

    // Try partial match
    const results = searchBlocks(query);
    return results[0];
  }

  private addBlock(block: Block, zoneType: ZoneType) {
    const projectBlock: ProjectBlock = {
      id: `${block.id}-${Date.now()}`,
      blockId: block.id,
      config: {},
      order: 0,
      zoneType
    };

    // Fill defaults
    if (block.params) {
      for (const param of block.params) {
        if (param.default) {
          projectBlock.config[param.id] = param.default;
        }
      }
    }

    switch (zoneType) {
      case 'imports':
        this.project.imports.push(projectBlock);
        break;
      case 'state':
        this.project.stateVariables.push(projectBlock);
        break;
      case 'function-body':
        if (this.selectedFunctionId) {
          const fn = this.project.functions.find(f => f.id === this.selectedFunctionId);
          if (fn) {
            fn.body.push(projectBlock);
          }
        }
        break;
    }
  }

  async handleCommand(input: string) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case '/add':
        await this.handleAdd(args);
        break;
      case '/search':
        this.handleSearch(args);
        break;
      case '/list':
        this.handleList(args);
        break;
      case '/func':
        this.handleFunc(args);
        break;
      case '/state':
        this.handleState(args);
        break;
      case '/preview':
        this.handlePreview();
        break;
      case '/save':
        await this.handleSave(args);
        break;
      case '/clear':
        this.handleClear();
        break;
      case '/help':
        this.printCommands();
        break;
      case '/exit':
      case '/quit':
        return false;
      default:
        // Try to interpret as block search
        if (cmd.startsWith('/')) {
          console.log(chalk.red(`Unknown command: ${cmd}`));
        } else {
          this.handleSearch(input);
        }
    }
    return true;
  }

  async handleAdd(query: string) {
    if (!query) {
      console.log(chalk.yellow('Usage: /add <block-name>'));
      return;
    }

    const block = this.findBlockByName(query);
    if (!block) {
      console.log(chalk.red(`Block not found: ${query}`));
      const suggestions = searchBlocks(query).slice(0, 3);
      if (suggestions.length > 0) {
        console.log(chalk.gray('Did you mean:'));
        this.printBlocks(suggestions);
      }
      return;
    }

    // Determine zone
    let zoneType: ZoneType = 'function-body';
    if (block.category === 'import') {
      zoneType = 'imports';
    } else if (block.category === 'state') {
      zoneType = 'state';
    } else if (!this.selectedFunctionId) {
      console.log(chalk.yellow('No function selected. Use /func <name> to create/select a function first.'));
      return;
    }

    // Validate
    const validation = validateDrop(block, zoneType, 0, this.project, this.selectedFunctionId || undefined);

    if (!validation.valid) {
      console.log(chalk.red('Cannot add block:'));
      validation.errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
      return;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
    }

    // Add block
    this.addBlock(block, zoneType);
    console.log(chalk.green(`✓ Added ${block.name}`));

    // Auto-add suggestions
    if (validation.autoAdd) {
      for (const autoId of validation.autoAdd) {
        const autoBlock = blocks.find(b => b.id === autoId);
        if (autoBlock && autoBlock.canDropIn[0]) {
          this.addBlock(autoBlock, autoBlock.canDropIn[0]);
          console.log(chalk.gray(`  → Auto-added ${autoBlock.name}`));
        }
      }
    }
  }

  handleSearch(query: string) {
    if (!query) {
      console.log(chalk.yellow('Usage: /search <query>'));
      return;
    }

    const results = searchBlocks(query);
    if (results.length === 0) {
      console.log(chalk.yellow('No blocks found.'));
      return;
    }

    console.log(chalk.bold(`\nFound ${results.length} blocks:`));
    this.printBlocks(results, 15);
  }

  handleList(category: string) {
    if (!category) {
      const cats = getCategories();
      console.log(chalk.bold('\nCategories:'));
      cats.forEach(c => {
        const count = getBlocksByCategory(c).length;
        console.log(`  ${chalk.cyan(c.padEnd(20))} ${chalk.gray(`(${count} blocks)`)}`);
      });
      return;
    }

    const categoryBlocks = getBlocksByCategory(category);
    if (categoryBlocks.length === 0) {
      console.log(chalk.yellow(`No blocks in category: ${category}`));
      return;
    }

    console.log(chalk.bold(`\n${category} blocks:`));
    this.printBlocks(categoryBlocks, 20);
  }

  handleFunc(name: string) {
    if (!name) {
      console.log(chalk.yellow('Usage: /func <function-name>'));
      if (this.project.functions.length > 0) {
        console.log(chalk.gray('\nExisting functions:'));
        this.project.functions.forEach(f => {
          const selected = f.id === this.selectedFunctionId ? chalk.green(' ← selected') : '';
          console.log(`  ${chalk.cyan(f.name)}()${selected}`);
        });
      }
      return;
    }

    // Check if function exists
    const existing = this.project.functions.find(f => f.name === name);
    if (existing) {
      this.selectedFunctionId = existing.id;
      console.log(chalk.green(`Selected function: ${name}()`));
      return;
    }

    // Create new function
    const fn: ProjectFunction = {
      id: `fn-${Date.now()}`,
      name,
      visibility: 'external',
      params: [],
      body: []
    };

    this.project.functions.push(fn);
    this.selectedFunctionId = fn.id;
    console.log(chalk.green(`Created function: ${name}()`));
  }

  handleState(typeName: string) {
    if (!typeName) {
      console.log(chalk.yellow('Usage: /state <type>'));
      console.log(chalk.gray('Types: euint8, euint16, euint32, euint64, euint128, euint256, ebool, eaddress'));
      return;
    }

    const block = this.findBlockByName(typeName);
    if (!block || block.category !== 'state') {
      console.log(chalk.red(`Invalid state type: ${typeName}`));
      return;
    }

    this.addBlock(block, 'state');
    console.log(chalk.green(`✓ Added state variable: ${block.name}`));
  }

  handlePreview() {
    const files = generateProject(this.project);
    const contract = files[`contracts/${this.project.name}.sol`];

    console.log(chalk.bold('\n═══ Generated Contract ═══\n'));
    console.log(chalk.gray(contract));
  }

  async handleSave(dir: string) {
    const outputDir = dir || `./${this.project.name.toLowerCase()}`;

    try {
      const files = generateProject(this.project);

      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(outputDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
        console.log(chalk.gray(`  Created: ${filePath}`));
      }

      console.log(chalk.green(`\n✓ Project saved to ${outputDir}`));
      console.log(chalk.gray('  Run: cd ' + outputDir + ' && pnpm install'));
    } catch (error) {
      console.log(chalk.red(`Failed to save: ${error}`));
    }
  }

  handleClear() {
    if (!this.selectedFunctionId) {
      console.log(chalk.yellow('No function selected.'));
      return;
    }

    const fn = this.project.functions.find(f => f.id === this.selectedFunctionId);
    if (fn) {
      fn.body = [];
      console.log(chalk.green(`Cleared function body: ${fn.name}()`));
    }
  }

  async run() {
    this.printHeader();
    this.printStatus();
    this.printCommands();

    let running = true;
    while (running) {
      const fnName = this.selectedFunctionId
        ? this.project.functions.find(f => f.id === this.selectedFunctionId)?.name
        : null;

      const promptText = fnName
        ? chalk.cyan(`[${this.project.name}::${fnName}] > `)
        : chalk.cyan(`[${this.project.name}] > `);

      const input = await prompt(promptText);
      if (!input.trim()) continue;

      running = await this.handleCommand(input);
    }

    rl.close();
    console.log(chalk.gray('\nGoodbye!'));
  }
}

export const composeCommand = new Command()
  .name('compose')
  .description('Interactive visual contract builder')
  .argument('[name]', 'Contract name', 'MyContract')
  .action(async (name: string) => {
    const session = new ComposerSession(name);
    await session.run();
  });

export async function executeCompose(name: string) {
  const session = new ComposerSession(name);
  await session.run();
}
