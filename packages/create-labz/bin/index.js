#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const TEMPLATES = [
  { name: 'counter', description: 'Simple encrypted counter with increment/decrement' },
  { name: 'add', description: 'Add two encrypted values' },
  { name: 'token', description: 'Confidential ERC20-style token' },
  { name: 'voting', description: 'Private voting system' },
  { name: 'auction', description: 'Sealed-bid auction with encrypted bids' },
  { name: 'dice-game', description: 'On-chain dice game with encrypted randomness' },
  { name: 'lottery', description: 'Private lottery with encrypted tickets' },
  { name: 'age-gate', description: 'Age verification without revealing birthdate' },
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function printBanner() {
  console.log(`
${COLORS.cyan}${COLORS.bright}  create-labz${COLORS.reset}
${COLORS.gray}  FHEVM Smart Contract Generator${COLORS.reset}
`);
}

function printTemplates() {
  console.log(`${COLORS.bright}Available templates:${COLORS.reset}\n`);
  TEMPLATES.forEach((t, i) => {
    console.log(`  ${COLORS.cyan}${(i + 1).toString().padStart(2)}.${COLORS.reset} ${t.name.padEnd(15)} ${COLORS.gray}${t.description}${COLORS.reset}`);
  });
  console.log();
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
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
    printTemplates();
    const choice = await prompt(`${COLORS.cyan}?${COLORS.reset} Select template (1-${TEMPLATES.length}): `);
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < TEMPLATES.length) {
      template = TEMPLATES[index].name;
    } else {
      // Try as template name
      template = choice;
    }
  }

  // If no project name, ask for it
  if (!projectName) {
    projectName = await prompt(`${COLORS.cyan}?${COLORS.reset} Project name: `);
    if (!projectName) {
      projectName = `my-${template}`;
    }
  }

  console.log();
  console.log(`${COLORS.green}Creating${COLORS.reset} ${COLORS.bright}${projectName}${COLORS.reset} from ${COLORS.cyan}${template}${COLORS.reset} template...`);
  console.log();

  // Run labz create
  try {
    execSync(`npx @0xflydev/labz create ${template} ${projectName} -y`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log();
    console.log(`${COLORS.green}${COLORS.bright}Done!${COLORS.reset}`);
    console.log();
    console.log(`${COLORS.gray}Next steps:${COLORS.reset}`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npx hardhat test`);
    console.log();
  } catch (error) {
    console.error('Failed to create project');
    process.exit(1);
  }
}

main().catch(console.error);
