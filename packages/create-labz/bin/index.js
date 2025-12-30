#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

// Organized by category
const CATEGORIES = [
  {
    name: 'Basics',
    color: '\x1b[32m', // green
    templates: [
      { id: 'counter', name: 'counter', desc: 'Simple encrypted counter' },
      { id: 'add', name: 'add', desc: 'Add two encrypted values' },
      { id: 'multiply', name: 'multiply', desc: 'Multiply encrypted values' },
      { id: 'boolean', name: 'boolean', desc: 'Boolean FHE operations' },
      { id: 'bitwise', name: 'bitwise', desc: 'Bitwise FHE operations' },
    ]
  },
  {
    name: 'Encryption',
    color: '\x1b[36m', // cyan
    templates: [
      { id: 'encryption-single', name: 'encrypt-single', desc: 'Encrypt a single value' },
      { id: 'encryption-multiple', name: 'encrypt-multi', desc: 'Encrypt multiple values' },
    ]
  },
  {
    name: 'Decryption',
    color: '\x1b[33m', // yellow
    templates: [
      { id: 'decryption-user-single', name: 'user-decrypt', desc: 'User decrypts single value' },
      { id: 'decryption-public-single', name: 'public-decrypt', desc: 'Public decryption' },
    ]
  },
  {
    name: 'Advanced',
    color: '\x1b[35m', // magenta
    templates: [
      { id: 'token', name: 'token', desc: 'Confidential ERC20 token' },
      { id: 'voting', name: 'voting', desc: 'Private voting system' },
      { id: 'auction', name: 'auction', desc: 'Sealed-bid auction' },
      { id: 'dice-game', name: 'dice-game', desc: 'Encrypted dice game' },
      { id: 'lottery', name: 'lottery', desc: 'Private lottery' },
      { id: 'blind-match', name: 'blind-match', desc: 'Blind matching system' },
    ]
  },
  {
    name: 'OpenZeppelin',
    color: '\x1b[34m', // blue
    templates: [
      { id: 'erc7984-token', name: 'erc7984-token', desc: 'Confidential ERC7984 token' },
      { id: 'amm-erc7984', name: 'amm', desc: 'Confidential AMM' },
      { id: 'vesting-wallet', name: 'vesting', desc: 'Confidential vesting wallet' },
    ]
  },
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function printBanner() {
  const orange = '\x1b[38;2;217;119;6m';  // #D97706
  const amber = '\x1b[38;2;245;176;20m';  // #F5B014

  console.log('');
  console.log(orange + '   _           _           _____' + COLORS.reset);
  console.log(orange + '  | |         | |         |__  /' + COLORS.reset);
  console.log(amber + '  | |    __ _ | |__   ___   / / ' + COLORS.reset);
  console.log(amber + '  | |   / _` || \'_ \\ |___| / / ' + COLORS.reset);
  console.log(orange + '  | |__ |(_| || |_) |     / /__ ' + COLORS.reset);
  console.log(orange + '  |____|\\__,_||_.__/     /_____|' + COLORS.reset);
  console.log('');
  console.log(COLORS.dim + '  FHE Smart Contract Generator' + COLORS.reset);
  console.log('');
  console.log('');
}

// Flatten all templates for selection
function getAllTemplates() {
  const all = [];
  CATEGORIES.forEach(cat => {
    cat.templates.forEach(t => {
      all.push({ ...t, category: cat.name, color: cat.color });
    });
  });
  return all;
}

async function selectTemplate() {
  const allTemplates = getAllTemplates();

  return new Promise((resolve) => {
    let selectedIndex = 0;
    let totalLines = 0;

    // Calculate total lines (categories + templates + spacing)
    CATEGORIES.forEach(cat => {
      totalLines += 1; // category header
      totalLines += cat.templates.length;
    });

    const renderMenu = () => {
      process.stdout.write(`\x1b[${totalLines}A`);

      CATEGORIES.forEach((cat, catIdx) => {
        // Category header
        process.stdout.write('\x1b[2K');
        console.log(`  ${cat.color}${COLORS.bright}${cat.name}${COLORS.reset}`);

        cat.templates.forEach((t, tIdx) => {
          // Calculate global index
          let globalIdx = 0;
          for (let i = 0; i < catIdx; i++) {
            globalIdx += CATEGORIES[i].templates.length;
          }
          globalIdx += tIdx;

          const isSelected = globalIdx === selectedIndex;
          const prefix = isSelected ? `${COLORS.cyan}>${COLORS.reset}` : ' ';
          const paddedName = t.name.padEnd(16);
          const name = isSelected
            ? `${COLORS.bright}${paddedName}${COLORS.reset}`
            : `${COLORS.dim}${paddedName}${COLORS.reset}`;
          const desc = isSelected
            ? `${COLORS.gray}${t.desc}${COLORS.reset}`
            : `${COLORS.dim}${t.desc}${COLORS.reset}`;

          process.stdout.write('\x1b[2K');
          console.log(`    ${prefix} ${name} ${desc}`);
        });
      });
    };

    // Initial render
    console.log(`${COLORS.bright}Select a template:${COLORS.reset} ${COLORS.dim}(arrow keys to navigate, enter to select)${COLORS.reset}\n`);

    CATEGORIES.forEach((cat, catIdx) => {
      console.log(`  ${cat.color}${COLORS.bright}${cat.name}${COLORS.reset}`);

      cat.templates.forEach((t, tIdx) => {
        let globalIdx = 0;
        for (let i = 0; i < catIdx; i++) {
          globalIdx += CATEGORIES[i].templates.length;
        }
        globalIdx += tIdx;

        const isSelected = globalIdx === 0;
        const prefix = isSelected ? `${COLORS.cyan}>${COLORS.reset}` : ' ';
        const paddedName = t.name.padEnd(16);
        const name = isSelected
          ? `${COLORS.bright}${paddedName}${COLORS.reset}`
          : `${COLORS.dim}${paddedName}${COLORS.reset}`;
        const desc = isSelected
          ? `${COLORS.gray}${t.desc}${COLORS.reset}`
          : `${COLORS.dim}${t.desc}${COLORS.reset}`;

        console.log(`    ${prefix} ${name} ${desc}`);
      });
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const totalTemplates = allTemplates.length;

    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : totalTemplates - 1;
        renderMenu();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < totalTemplates - 1 ? selectedIndex + 1 : 0;
        renderMenu();
      } else if (key.name === 'return') {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeAllListeners('keypress');
        console.log();
        resolve(allTemplates[selectedIndex]);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        console.log('\n\nCancelled');
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
  let templateId = args[0];
  let projectName = args[1];

  // If no template provided, show interactive menu
  if (!templateId) {
    const selected = await selectTemplate();
    templateId = selected.id;
    console.log(`${COLORS.green}Selected:${COLORS.reset} ${selected.color}${selected.name}${COLORS.reset} ${COLORS.dim}(${selected.category})${COLORS.reset}\n`);
  }

  // If no project name, ask for it
  if (!projectName) {
    const defaultName = `my-${templateId.split('/').pop().split('-')[0]}`;
    projectName = await promptInput('Project name', defaultName);
  }

  console.log();
  console.log(`${COLORS.green}Creating${COLORS.reset} ${COLORS.bright}${projectName}${COLORS.reset} from ${COLORS.cyan}${templateId}${COLORS.reset} template...\n`);

  // Run labz create
  try {
    execSync(`npx @0xflydev/labz create ${templateId} ${projectName} -y`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('Failed to create project');
    process.exit(1);
  }
}

main().catch(console.error);
