/**
 * Deploy Command
 * Deploy FHEVM contracts to network
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { select, confirm } from '@inquirer/prompts';
import { printBanner, formatError, formatSuccess, formatInfo } from '../utils';

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcEnvVar: string;
  explorer?: string;
  verifySupported: boolean;
}

const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcEnvVar: 'SEPOLIA_RPC_URL',
    explorer: 'https://sepolia.etherscan.io',
    verifySupported: true
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcEnvVar: 'MAINNET_RPC_URL',
    explorer: 'https://etherscan.io',
    verifySupported: true
  },
  localhost: {
    name: 'Localhost (Hardhat)',
    chainId: 31337,
    rpcEnvVar: '',
    verifySupported: false
  },
  hardhat: {
    name: 'Hardhat Network',
    chainId: 31337,
    rpcEnvVar: '',
    verifySupported: false
  }
};

export const deployCommand = new Command('deploy')
  .description('Deploy contracts to network')
  .argument('[contract]', 'Contract name to deploy (auto-detect if not specified)')
  .option('-n, --network <network>', 'Target network', 'localhost')
  .option('--verify', 'Verify contract on explorer after deployment')
  .option('--no-compile', 'Skip compilation step')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (contract, options) => {
    await executeDeploy(contract, options);
  });

export async function executeDeploy(
  contractName?: string,
  options: { network?: string; verify?: boolean; compile?: boolean; yes?: boolean } = {}
) {
  printBanner();

  const projectDir = process.cwd();

  // Check if we're in a valid project
  if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
    console.log(formatError('Not in a project directory. Run this command from your project root.'));
    process.exit(1);
  }

  if (!fs.existsSync(path.join(projectDir, 'hardhat.config.ts')) &&
      !fs.existsSync(path.join(projectDir, 'hardhat.config.js'))) {
    console.log(formatError('No hardhat.config found. Is this a Hardhat project?'));
    process.exit(1);
  }

  // Check node_modules
  if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
    console.log(formatError('Dependencies not installed. Run: npm install'));
    process.exit(1);
  }

  const network = options.network || 'localhost';
  const networkConfig = NETWORKS[network];

  if (!networkConfig) {
    console.log(formatError(`Unknown network: ${network}`));
    console.log(formatInfo(`Available networks: ${Object.keys(NETWORKS).join(', ')}`));
    process.exit(1);
  }

  // For non-local networks, check .env
  if (network !== 'localhost' && network !== 'hardhat') {
    const envPath = path.join(projectDir, '.env');
    if (!fs.existsSync(envPath)) {
      console.log(formatError('.env file not found. Required for network deployment.'));
      console.log(formatInfo('Create .env with MNEMONIC or PRIVATE_KEY'));
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasKey = /^(MNEMONIC|PRIVATE_KEY)\s*=\s*.+/m.test(envContent);
    if (!hasKey) {
      console.log(formatError('No MNEMONIC or PRIVATE_KEY found in .env'));
      process.exit(1);
    }
  }

  // Auto-detect contract if not specified
  let targetContract = contractName;
  if (!targetContract) {
    const contractsDir = path.join(projectDir, 'contracts');
    if (fs.existsSync(contractsDir)) {
      const solFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));
      if (solFiles.length === 1) {
        targetContract = solFiles[0].replace('.sol', '');
      } else if (solFiles.length > 1) {
        // Let user choose
        const choices = solFiles.map(f => ({
          name: f.replace('.sol', ''),
          value: f.replace('.sol', '')
        }));
        targetContract = await select({
          message: 'Select contract to deploy:',
          choices
        });
      }
    }
  }

  if (!targetContract) {
    console.log(formatError('No contract found in contracts/ directory'));
    process.exit(1);
  }

  // Confirmation
  const forceYes = options.yes || process.argv.includes('--yes') || process.argv.includes('-y');

  console.log('');
  console.log(chalk.bold('  Deployment Summary'));
  console.log(chalk.dim('  ------------------'));
  console.log(`  Contract:  ${chalk.cyan(targetContract)}`);
  console.log(`  Network:   ${chalk.cyan(networkConfig.name)} (${network})`);
  if (network !== 'localhost' && network !== 'hardhat') {
    console.log(`  Explorer:  ${chalk.cyan(networkConfig.explorer || 'N/A')}`);
  }
  if (options.verify && networkConfig.verifySupported) {
    console.log(`  Verify:    ${chalk.green('Yes')}`);
  }
  console.log('');

  if (!forceYes) {
    if (network === 'mainnet') {
      console.log(chalk.yellow('  WARNING: Deploying to MAINNET will cost real ETH!'));
      console.log('');
    }

    const confirmed = await confirm({
      message: 'Proceed with deployment?',
      default: network === 'localhost' || network === 'hardhat',
      theme: { prefix: { idle: chalk.hex('#22C55E')('?') } }
    });

    if (!confirmed) {
      console.log(formatInfo('Deployment cancelled'));
      return;
    }
  }

  console.log('');

  // Step 1: Compile (unless --no-compile)
  if (options.compile !== false) {
    const compileSpinner = ora('Compiling contracts...').start();
    try {
      execSync('npx hardhat compile', {
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      compileSpinner.succeed('Contracts compiled');
    } catch (error: any) {
      compileSpinner.fail('Compilation failed');
      if (error.stderr) {
        console.log(chalk.red(error.stderr.toString()));
      }
      process.exit(1);
    }
  }

  // Step 2: Deploy
  const deploySpinner = ora(`Deploying ${targetContract} to ${network}...`).start();

  try {
    // Check if deploy script exists
    const deployScriptTs = path.join(projectDir, 'deploy', 'deploy.ts');
    const deployScriptJs = path.join(projectDir, 'deploy', 'deploy.js');

    let deployOutput: string;

    if (fs.existsSync(deployScriptTs) || fs.existsSync(deployScriptJs)) {
      // Use existing deploy script
      deployOutput = execSync(`npx hardhat run deploy/deploy.ts --network ${network}`, {
        cwd: projectDir,
        encoding: 'utf-8',
        env: { ...process.env }
      });
    } else {
      // Use inline deployment
      const deployCode = `
        const { ethers } = require("hardhat");
        async function main() {
          const factory = await ethers.getContractFactory("${targetContract}");
          const contract = await factory.deploy();
          await contract.waitForDeployment();
          const address = await contract.getAddress();
          console.log("DEPLOYED_ADDRESS:" + address);
        }
        main().catch((error) => {
          console.error(error);
          process.exit(1);
        });
      `;

      // Write temp deploy script
      const tempScript = path.join(projectDir, 'deploy', '_temp_deploy.js');
      fs.mkdirSync(path.dirname(tempScript), { recursive: true });
      fs.writeFileSync(tempScript, deployCode);

      try {
        deployOutput = execSync(`npx hardhat run deploy/_temp_deploy.js --network ${network}`, {
          cwd: projectDir,
          encoding: 'utf-8',
          env: { ...process.env }
        });
      } finally {
        // Cleanup temp script
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }
      }
    }

    deploySpinner.succeed(`${targetContract} deployed`);

    // Extract contract address from output
    const addressMatch = deployOutput.match(/DEPLOYED_ADDRESS:?(0x[a-fA-F0-9]{40})/i) ||
                         deployOutput.match(/deployed to:?\s*(0x[a-fA-F0-9]{40})/i) ||
                         deployOutput.match(/(0x[a-fA-F0-9]{40})/);

    const contractAddress = addressMatch ? addressMatch[1] : null;

    if (contractAddress) {
      console.log('');
      console.log(chalk.bold('  Contract Address'));
      console.log(chalk.dim('  ----------------'));
      console.log(`  ${chalk.green(contractAddress)}`);

      if (networkConfig.explorer) {
        console.log('');
        console.log(chalk.dim(`  ${networkConfig.explorer}/address/${contractAddress}`));
      }

      // Step 3: Verify (if requested and supported)
      if (options.verify && networkConfig.verifySupported && contractAddress) {
        console.log('');
        const verifySpinner = ora('Verifying contract on explorer...').start();

        try {
          execSync(`npx hardhat verify --network ${network} ${contractAddress}`, {
            cwd: projectDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
          });
          verifySpinner.succeed('Contract verified');
        } catch (error: any) {
          // Verification might fail if already verified
          if (error.stderr?.includes('Already Verified')) {
            verifySpinner.succeed('Contract already verified');
          } else {
            verifySpinner.warn('Verification failed (contract deployed successfully)');
            console.log(chalk.dim('  Run manually: npx hardhat verify --network ' + network + ' ' + contractAddress));
          }
        }
      }

      console.log('');
      console.log(formatSuccess('Deployment complete!'));
    } else {
      console.log('');
      console.log(formatSuccess('Deployment complete!'));
      console.log(chalk.dim('  (Could not extract contract address from output)'));
    }

  } catch (error: any) {
    deploySpinner.fail('Deployment failed');
    console.log('');
    if (error.message) {
      console.log(chalk.red(error.message));
    }
    if (error.stderr) {
      console.log(chalk.red(error.stderr.toString().slice(0, 500)));
    }
    process.exit(1);
  }
}
