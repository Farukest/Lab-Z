#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const TEMPLATES = [
  { name: 'counter', description: 'Simple encrypted counter' },
  { name: 'add', description: 'Add two encrypted values' },
  { name: 'token', description: 'Confidential ERC20-style token' },
  { name: 'voting', description: 'Private voting system' },
  { name: 'auction', description: 'Sealed-bid auction' },
  { name: 'dice-game', description: 'On-chain dice game' },
  { name: 'lottery', description: 'Private lottery' },
  { name: 'age-gate', description: 'Age verification' },
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  dim: '\x1b[2m',
};

function printBanner() {
  console.log(`
${COLORS.cyan}${COLORS.bright}  create-labz${COLORS.reset}
${COLORS.gray}  FHEVM Smart Contract Generator${COLORS.reset}
`);
}

async function selectTemplate() {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    const renderMenu = () => {
      // Move cursor up to redraw
      if (selectedIndex > 0 || selectedIndex === 0) {
        process.stdout.write(`\x1b[${TEMPLATES.length}A`);
      }

      TEMPLATES.forEach((t, i) => {
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? `${COLORS.cyan}>${COLORS.reset}` : ' ';
        const name = isSelected
          ? `${COLORS.cyan}${COLORS.bright}${t.name}${COLORS.reset}`
          : `${COLORS.dim}${t.name}${COLORS.reset}`;
        const desc = isSelected
          ? `${COLORS.gray}${t.description}${COLORS.reset}`
          : `${COLORS.dim}${t.description}${COLORS.reset}`;
        console.log(`  ${prefix} ${name.padEnd(25)} ${desc}`);
      });
    };

    // Initial render
    console.log(`${COLORS.bright}Select a template:${COLORS.reset} ${COLORS.dim}(Use arrow keys)${COLORS.reset}\n`);
    TEMPLATES.forEach((t, i) => {
      const isSelected = i === 0;
      const prefix = isSelected ? `${COLORS.cyan}>${COLORS.reset}` : ' ';
      const name = isSelected
        ? `${COLORS.cyan}${COLORS.bright}${t.name}${COLORS.reset}`
        : `${COLORS.dim}${t.name}${COLORS.reset}`;
      const desc = isSelected
        ? `${COLORS.gray}${t.description}${COLORS.reset}`
        : `${COLORS.dim}${t.description}${COLORS.reset}`;
      console.log(`  ${prefix} ${name.padEnd(25)} ${desc}`);
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : TEMPLATES.length - 1;
        renderMenu();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < TEMPLATES.length - 1 ? selectedIndex + 1 : 0;
        renderMenu();
      } else if (key.name === 'return') {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeAllListeners('keypress');
        console.log();
        resolve(TEMPLATES[selectedIndex].name);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        console.log('\nCancelled');
        process.exit(0);
      }
    });

    process.stdin.resume();
  });
}

async function promptInput(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` ${COLORS.dim}(${defaultValue})${COLORS.reset}` : '';
    rl.question(`${COLORS.cyan}?${COLORS.reset} ${question}${defaultText}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  printBanner();

  const args = process.argv.slice(2);
  let template = args[0];
  let projectName = args[1];

  // If no template provided, show interactive menu
  if (!template) {
    template = await selectTemplate();
    console.log(`${COLORS.green}Selected:${COLORS.reset} ${COLORS.cyan}${template}${COLORS.reset}\n`);
  }

  // If no project name, ask for it
  if (!projectName) {
    projectName = await promptInput('Project name', `my-${template}`);
  }

  console.log();
  console.log(`${COLORS.green}Creating${COLORS.reset} ${COLORS.bright}${projectName}${COLORS.reset} from ${COLORS.cyan}${template}${COLORS.reset} template...\n`);

  // Run labz create
  try {
    execSync(`npx @0xflydev/labz create ${template} ${projectName} -y`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('Failed to create project');
    process.exit(1);
  }
}

main().catch(console.error);
