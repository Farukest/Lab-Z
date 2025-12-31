/**
 * Code Generator
 *
 * Converts project state into Solidity code
 */

import { ProjectState, ProjectBlock, ProjectFunction } from './types';
import { getBlockById } from './registry';

/**
 * Line mapping for a block in generated code
 */
export interface BlockLineMapping {
  blockId: string;       // The project block instance ID
  sourceBlockId: string; // The block definition ID
  lineStart: number;
  lineEnd: number;
  zoneType: string;
}

/**
 * Result of code generation with line mappings
 */
export interface GeneratedCodeWithMapping {
  code: string;
  mappings: BlockLineMapping[];
}

/**
 * Render a template with parameters
 */
function renderTemplate(template: string, config: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(config)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Generate import statements
 */
function generateImports(imports: ProjectBlock[]): string {
  const lines: string[] = [];

  for (const imp of imports) {
    const block = getBlockById(imp.blockId);
    if (block) {
      lines.push(renderTemplate(block.template, imp.config));
    }
  }

  return lines.join('\n');
}

/**
 * Generate state variables
 */
function generateStateVariables(stateVars: ProjectBlock[], indent: string = '    '): string {
  const lines: string[] = [];

  for (const stateVar of stateVars) {
    const block = getBlockById(stateVar.blockId);
    if (block) {
      lines.push(indent + renderTemplate(block.template, stateVar.config));
    }
  }

  return lines.join('\n');
}

/**
 * Generate function body
 */
function generateFunctionBody(body: ProjectBlock[], indent: string = '        '): string {
  const lines: string[] = [];

  for (const item of body) {
    const block = getBlockById(item.blockId);
    if (block) {
      lines.push(indent + renderTemplate(block.template, item.config));
    }
  }

  return lines.join('\n');
}

/**
 * Generate a single function
 */
function generateFunction(fn: ProjectFunction, indent: string = '    '): string {
  const lines: string[] = [];

  // Function signature
  const params = fn.params.map(p => `${p.type} ${p.name}`).join(', ');
  const visibility = fn.visibility || 'external';
  const stateMutability = fn.stateMutability ? ` ${fn.stateMutability}` : '';

  let returns = '';
  if (fn.returns && fn.returns.length > 0) {
    const returnTypes = fn.returns.map(r => r.name ? `${r.type} ${r.name}` : r.type).join(', ');
    returns = ` returns (${returnTypes})`;
  }

  lines.push(`${indent}function ${fn.name}(${params}) ${visibility}${stateMutability}${returns} {`);

  // Function body
  if (fn.body.length > 0) {
    lines.push(generateFunctionBody(fn.body, indent + '    '));
  }

  lines.push(`${indent}}`);

  return lines.join('\n');
}

/**
 * Generate complete Solidity contract
 */
export function generateContract(state: ProjectState): string {
  const lines: string[] = [];

  // Pragma
  lines.push('// SPDX-License-Identifier: MIT');
  lines.push('pragma solidity ^0.8.24;');
  lines.push('');

  // Imports
  if (state.imports.length > 0) {
    lines.push(generateImports(state.imports));
    lines.push('');
  }

  // Contract declaration
  const inherits = state.inherits.length > 0 ? ` is ${state.inherits.join(', ')}` : '';
  lines.push(`contract ${state.name}${inherits} {`);

  // State variables
  if (state.stateVariables.length > 0) {
    lines.push(generateStateVariables(state.stateVariables));
    lines.push('');
  }

  // Constructor
  if (state.constructorBody && state.constructorBody.length > 0) {
    lines.push('    constructor() {');
    lines.push(generateFunctionBody(state.constructorBody, '        '));
    lines.push('    }');
    lines.push('');
  }

  // Functions
  for (const fn of state.functions) {
    lines.push(generateFunction(fn));
    lines.push('');
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate complete Solidity contract with line mappings for each block
 */
export function generateContractWithMapping(state: ProjectState): GeneratedCodeWithMapping {
  const lines: string[] = [];
  const mappings: BlockLineMapping[] = [];
  let currentLine = 1;

  // Pragma
  lines.push('// SPDX-License-Identifier: MIT');
  lines.push('pragma solidity ^0.8.24;');
  lines.push('');
  currentLine = 4; // After pragma + empty line

  // Imports
  if (state.imports.length > 0) {
    for (const imp of state.imports) {
      const block = getBlockById(imp.blockId);
      if (block) {
        const rendered = renderTemplate(block.template, imp.config);
        const lineCount = rendered.split('\n').length;

        mappings.push({
          blockId: imp.id,
          sourceBlockId: imp.blockId,
          lineStart: currentLine,
          lineEnd: currentLine + lineCount - 1,
          zoneType: 'imports'
        });

        lines.push(rendered);
        currentLine += lineCount;
      }
    }
    lines.push('');
    currentLine++;
  }

  // Contract declaration
  const inherits = state.inherits.length > 0 ? ` is ${state.inherits.join(', ')}` : '';
  lines.push(`contract ${state.name}${inherits} {`);
  currentLine++;

  // State variables
  if (state.stateVariables.length > 0) {
    for (const stateVar of state.stateVariables) {
      const block = getBlockById(stateVar.blockId);
      if (block) {
        const rendered = '    ' + renderTemplate(block.template, stateVar.config);
        const lineCount = rendered.split('\n').length;

        mappings.push({
          blockId: stateVar.id,
          sourceBlockId: stateVar.blockId,
          lineStart: currentLine,
          lineEnd: currentLine + lineCount - 1,
          zoneType: 'state'
        });

        lines.push(rendered);
        currentLine += lineCount;
      }
    }
    lines.push('');
    currentLine++;
  }

  // Constructor
  if (state.constructorBody && state.constructorBody.length > 0) {
    lines.push('    constructor() {');
    currentLine++;

    for (const item of state.constructorBody) {
      const block = getBlockById(item.blockId);
      if (block) {
        const rendered = '        ' + renderTemplate(block.template, item.config);
        const lineCount = rendered.split('\n').length;

        mappings.push({
          blockId: item.id,
          sourceBlockId: item.blockId,
          lineStart: currentLine,
          lineEnd: currentLine + lineCount - 1,
          zoneType: 'constructor'
        });

        lines.push(rendered);
        currentLine += lineCount;
      }
    }

    lines.push('    }');
    lines.push('');
    currentLine += 2;
  }

  // Functions
  for (const fn of state.functions) {
    // Function signature
    const params = fn.params.map(p => `${p.type} ${p.name}`).join(', ');
    const visibility = fn.visibility || 'external';
    const stateMutability = fn.stateMutability ? ` ${fn.stateMutability}` : '';

    let returns = '';
    if (fn.returns && fn.returns.length > 0) {
      const returnTypes = fn.returns.map(r => r.name ? `${r.type} ${r.name}` : r.type).join(', ');
      returns = ` returns (${returnTypes})`;
    }

    lines.push(`    function ${fn.name}(${params}) ${visibility}${stateMutability}${returns} {`);
    currentLine++;

    // Function body
    for (const item of fn.body) {
      const block = getBlockById(item.blockId);
      if (block) {
        const rendered = '        ' + renderTemplate(block.template, item.config);
        const lineCount = rendered.split('\n').length;

        mappings.push({
          blockId: item.id,
          sourceBlockId: item.blockId,
          lineStart: currentLine,
          lineEnd: currentLine + lineCount - 1,
          zoneType: 'function-body'
        });

        lines.push(rendered);
        currentLine += lineCount;
      }
    }

    lines.push('    }');
    lines.push('');
    currentLine += 2;
  }

  lines.push('}');

  return {
    code: lines.join('\n'),
    mappings
  };
}

/**
 * Generate test file for the contract
 */
export function generateTest(state: ProjectState): string {
  const lines: string[] = [];

  lines.push('import { expect } from "chai";');
  lines.push('import { ethers, fhevm } from "hardhat";');
  lines.push('import { FhevmType } from "@fhevm/hardhat-plugin";');
  lines.push('');
  lines.push(`describe("${state.name}", function () {`);

  // Generate basic tests for each function
  for (const fn of state.functions) {
    lines.push(`  describe("${fn.name}", function () {`);
    lines.push(`    it("should execute ${fn.name}", async function () {`);
    lines.push('      const [alice] = await ethers.getSigners();');
    lines.push(`      const factory = await ethers.getContractFactory("${state.name}");`);
    lines.push('      const contract = await factory.deploy();');
    lines.push('      const address = await contract.getAddress();');
    lines.push('');
    lines.push('      // TODO: Add test implementation');
    lines.push('    });');
    lines.push('  });');
    lines.push('');
  }

  lines.push('});');

  return lines.join('\n');
}

/**
 * Generate package.json
 */
export function generatePackageJson(state: ProjectState): string {
  return JSON.stringify({
    name: state.name.toLowerCase().replace(/\s+/g, '-'),
    version: state.version || '1.0.0',
    scripts: {
      compile: 'hardhat compile',
      test: 'hardhat test',
      deploy: 'hardhat run deploy/deploy.ts'
    },
    devDependencies: {
      '@fhevm/hardhat-plugin': '^0.1.0',
      '@fhevm/solidity': '^0.10.0',
      '@nomicfoundation/hardhat-toolbox': '^5.0.0',
      'hardhat': '^2.19.0',
      'typescript': '^5.0.0'
    }
  }, null, 2);
}

/**
 * Generate hardhat.config.ts
 */
export function generateHardhatConfig(): string {
  return `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    fhevmLocal: {
      url: "http://localhost:8545",
    }
  }
};

export default config;`;
}

/**
 * Generate deploy script
 */
export function generateDeployScript(state: ProjectState): string {
  return `import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("${state.name}");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log("${state.name} deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;
}

/**
 * Generate all project files
 */
export function generateProject(state: ProjectState): Record<string, string> {
  return {
    [`contracts/${state.name}.sol`]: generateContract(state),
    [`test/${state.name}.test.ts`]: generateTest(state),
    'deploy/deploy.ts': generateDeployScript(state),
    'package.json': generatePackageJson(state),
    'hardhat.config.ts': generateHardhatConfig(),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true
      },
      include: ['./scripts', './test'],
      files: ['./hardhat.config.ts']
    }, null, 2)
  };
}

/**
 * Create empty project state
 */
export function createEmptyProject(name: string): ProjectState {
  return {
    name,
    version: '1.0.0',
    inherits: ['SepoliaConfig'],
    imports: [
      {
        id: 'import-1',
        blockId: 'import-fhe',
        config: { types: 'euint32, externalEuint32' },
        order: 0,
        zoneType: 'imports'
      },
      {
        id: 'import-2',
        blockId: 'import-config',
        config: {},
        order: 1,
        zoneType: 'imports'
      }
    ],
    stateVariables: [],
    functions: [],
    modifiers: []
  };
}
