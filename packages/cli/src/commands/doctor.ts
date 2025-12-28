/**
 * Doctor Command
 * Check FHEVM development environment
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { printBanner } from '../utils';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  hint?: string;
}

export const doctorCommand = new Command('doctor')
  .description('Check FHEVM development environment')
  .option('-p, --path <dir>', 'Project directory to check', '.')
  .action(async (options) => {
    await executeDoctor(options);
  });

export async function executeDoctor(options: { path?: string } = {}) {
  printBanner();

  const projectDir = path.resolve(options.path || '.');
  const results: CheckResult[] = [];

  console.log(chalk.bold('\n  FHEVM Environment Check\n'));
  console.log(chalk.dim(`  Directory: ${projectDir}\n`));

  // 1. Check Node.js version
  results.push(checkNodeVersion());

  // 2. Check npm/pnpm
  results.push(checkPackageManager());

  // 3. Check if in a project directory
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));

  if (hasPackageJson) {
    // 4. Check package.json for dependencies
    results.push(checkDependencies(projectDir));

    // 5. Check hardhat.config
    results.push(checkHardhatConfig(projectDir));

    // 6. Check .env file
    results.push(checkEnvFile(projectDir));

    // 7. Check .env variables
    results.push(checkEnvVariables(projectDir));

    // 8. Check node_modules
    results.push(checkNodeModules(projectDir));
  } else {
    results.push({
      name: 'Project',
      status: 'warn',
      message: 'No package.json found',
      hint: 'Run labz create <template> to create a new project'
    });
  }

  // Print results
  console.log('');
  for (const result of results) {
    printResult(result);
  }

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────'));
  console.log('');

  if (failed === 0 && warned === 0) {
    console.log(chalk.green('  All checks passed! Ready to develop.\n'));
  } else if (failed === 0) {
    console.log(chalk.yellow(`  ${passed} passed, ${warned} warnings\n`));
  } else {
    console.log(chalk.red(`  ${passed} passed, ${failed} failed, ${warned} warnings\n`));
  }

  // Print hints for failed/warned checks
  const hintsToShow = results.filter(r => (r.status === 'fail' || r.status === 'warn') && r.hint);
  if (hintsToShow.length > 0) {
    console.log(chalk.bold('  Suggestions:\n'));
    for (const result of hintsToShow) {
      console.log(chalk.dim(`  - ${result.hint}`));
    }
    console.log('');
  }
}

function printResult(result: CheckResult) {
  const icon = result.status === 'pass'
    ? chalk.green('  [OK]')
    : result.status === 'fail'
      ? chalk.red('  [X] ')
      : chalk.yellow('  [!] ');

  const nameColor = result.status === 'pass'
    ? chalk.white
    : result.status === 'fail'
      ? chalk.red
      : chalk.yellow;

  console.log(`${icon} ${nameColor(result.name.padEnd(20))} ${chalk.dim(result.message)}`);
}

function checkNodeVersion(): CheckResult {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major >= 18) {
      return {
        name: 'Node.js',
        status: 'pass',
        message: version
      };
    } else {
      return {
        name: 'Node.js',
        status: 'fail',
        message: `${version} (requires >=18)`,
        hint: 'Upgrade Node.js to version 18 or higher'
      };
    }
  } catch {
    return {
      name: 'Node.js',
      status: 'fail',
      message: 'Not found',
      hint: 'Install Node.js from https://nodejs.org'
    };
  }
}

function checkPackageManager(): CheckResult {
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return {
      name: 'npm',
      status: 'pass',
      message: `v${npmVersion}`
    };
  } catch {
    return {
      name: 'npm',
      status: 'fail',
      message: 'Not found',
      hint: 'npm should come with Node.js installation'
    };
  }
}

function checkDependencies(projectDir: string): CheckResult {
  try {
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const hasFhevmSolidity = '@fhevm/solidity' in allDeps;
    const hasFhevmPlugin = '@fhevm/hardhat-plugin' in allDeps;
    const hasHardhat = 'hardhat' in allDeps;

    if (hasFhevmSolidity && hasFhevmPlugin && hasHardhat) {
      return {
        name: 'FHEVM Dependencies',
        status: 'pass',
        message: '@fhevm/solidity, @fhevm/hardhat-plugin'
      };
    } else if (hasHardhat && (hasFhevmSolidity || hasFhevmPlugin)) {
      const missing = [];
      if (!hasFhevmSolidity) missing.push('@fhevm/solidity');
      if (!hasFhevmPlugin) missing.push('@fhevm/hardhat-plugin');
      return {
        name: 'FHEVM Dependencies',
        status: 'warn',
        message: `Missing: ${missing.join(', ')}`,
        hint: `Run: npm install ${missing.join(' ')}`
      };
    } else if (hasHardhat) {
      return {
        name: 'FHEVM Dependencies',
        status: 'fail',
        message: 'FHEVM packages not found',
        hint: 'Run: npm install @fhevm/solidity @fhevm/hardhat-plugin'
      };
    } else {
      return {
        name: 'FHEVM Dependencies',
        status: 'fail',
        message: 'Hardhat not found',
        hint: 'Run: npm install hardhat @fhevm/solidity @fhevm/hardhat-plugin'
      };
    }
  } catch (error) {
    return {
      name: 'FHEVM Dependencies',
      status: 'fail',
      message: 'Could not read package.json',
      hint: 'Ensure package.json is valid JSON'
    };
  }
}

function checkHardhatConfig(projectDir: string): CheckResult {
  const configTs = path.join(projectDir, 'hardhat.config.ts');
  const configJs = path.join(projectDir, 'hardhat.config.js');

  if (fs.existsSync(configTs)) {
    const content = fs.readFileSync(configTs, 'utf-8');
    if (content.includes('@fhevm/hardhat-plugin')) {
      return {
        name: 'Hardhat Config',
        status: 'pass',
        message: 'hardhat.config.ts with FHEVM plugin'
      };
    } else {
      return {
        name: 'Hardhat Config',
        status: 'warn',
        message: 'FHEVM plugin not imported',
        hint: 'Add: import "@fhevm/hardhat-plugin" to hardhat.config.ts'
      };
    }
  } else if (fs.existsSync(configJs)) {
    const content = fs.readFileSync(configJs, 'utf-8');
    if (content.includes('@fhevm/hardhat-plugin')) {
      return {
        name: 'Hardhat Config',
        status: 'pass',
        message: 'hardhat.config.js with FHEVM plugin'
      };
    } else {
      return {
        name: 'Hardhat Config',
        status: 'warn',
        message: 'FHEVM plugin not imported',
        hint: 'Add: require("@fhevm/hardhat-plugin") to hardhat.config.js'
      };
    }
  } else {
    return {
      name: 'Hardhat Config',
      status: 'fail',
      message: 'Not found',
      hint: 'Create hardhat.config.ts with FHEVM plugin configuration'
    };
  }
}

function checkEnvFile(projectDir: string): CheckResult {
  const envPath = path.join(projectDir, '.env');
  const envExamplePath = path.join(projectDir, '.env.example');

  if (fs.existsSync(envPath)) {
    return {
      name: '.env File',
      status: 'pass',
      message: 'Found'
    };
  } else if (fs.existsSync(envExamplePath)) {
    return {
      name: '.env File',
      status: 'warn',
      message: '.env.example exists but .env missing',
      hint: 'Copy .env.example to .env and fill in your values'
    };
  } else {
    return {
      name: '.env File',
      status: 'warn',
      message: 'Not found (optional for local dev)',
      hint: 'Create .env for network deployment with MNEMONIC/PRIVATE_KEY'
    };
  }
}

function checkEnvVariables(projectDir: string): CheckResult {
  const envPath = path.join(projectDir, '.env');

  if (!fs.existsSync(envPath)) {
    return {
      name: 'Env Variables',
      status: 'warn',
      message: 'No .env file',
      hint: 'Create .env with MNEMONIC or PRIVATE_KEY for deployment'
    };
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const hasMnemonic = /^MNEMONIC\s*=\s*.+/m.test(content);
    const hasPrivateKey = /^PRIVATE_KEY\s*=\s*.+/m.test(content);
    const hasRpcUrl = /^(RPC_URL|SEPOLIA_RPC_URL|MAINNET_RPC_URL)\s*=\s*.+/m.test(content);

    if ((hasMnemonic || hasPrivateKey) && hasRpcUrl) {
      return {
        name: 'Env Variables',
        status: 'pass',
        message: 'Keys and RPC URL configured'
      };
    } else if (hasMnemonic || hasPrivateKey) {
      return {
        name: 'Env Variables',
        status: 'warn',
        message: 'Missing RPC URL',
        hint: 'Add RPC_URL to .env for network deployment'
      };
    } else if (hasRpcUrl) {
      return {
        name: 'Env Variables',
        status: 'warn',
        message: 'Missing MNEMONIC or PRIVATE_KEY',
        hint: 'Add MNEMONIC or PRIVATE_KEY to .env for deployment'
      };
    } else {
      return {
        name: 'Env Variables',
        status: 'warn',
        message: 'No deployment keys configured',
        hint: 'Add MNEMONIC/PRIVATE_KEY and RPC_URL for deployment'
      };
    }
  } catch {
    return {
      name: 'Env Variables',
      status: 'fail',
      message: 'Could not read .env',
      hint: 'Ensure .env file is readable'
    };
  }
}

function checkNodeModules(projectDir: string): CheckResult {
  const nodeModulesPath = path.join(projectDir, 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    // Check if hardhat is actually installed
    const hardhatPath = path.join(nodeModulesPath, 'hardhat');
    if (fs.existsSync(hardhatPath)) {
      return {
        name: 'node_modules',
        status: 'pass',
        message: 'Dependencies installed'
      };
    } else {
      return {
        name: 'node_modules',
        status: 'warn',
        message: 'Incomplete installation',
        hint: 'Run: npm install'
      };
    }
  } else {
    return {
      name: 'node_modules',
      status: 'fail',
      message: 'Not installed',
      hint: 'Run: npm install'
    };
  }
}
