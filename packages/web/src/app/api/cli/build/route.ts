import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

interface BaseTemplate {
  name: string;
  description: string;
  contract: string;
  test: string;
  slots: string[];
}

interface Module {
  name: string;
  category: string;
  description: string;
  inject: Record<string, string>;
  compatibleWith: string[];
}

// Load base template
function loadBaseTemplate(baseName: string): BaseTemplate | null {
  const basesDir = path.join(process.cwd(), '..', '..', 'templates', 'buildable', 'projects');
  const basePath = path.join(basesDir, baseName);

  if (!fs.existsSync(basePath)) return null;

  const metaPath = path.join(basePath, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  // Find .sol.tmpl file
  const contractsDir = path.join(basePath, 'contracts');
  if (!fs.existsSync(contractsDir)) return null;

  const tmplFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol.tmpl'));
  if (tmplFiles.length === 0) return null;

  const contractTmpl = fs.readFileSync(path.join(contractsDir, tmplFiles[0]), 'utf-8');

  // Find test file
  const testDir = path.join(basePath, 'test');
  let testTmpl = '';
  if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts.tmpl') || f.endsWith('.test.ts'));
    if (testFiles.length > 0) {
      testTmpl = fs.readFileSync(path.join(testDir, testFiles[0]), 'utf-8');
    }
  }

  // Extract slots from contract template
  const slotMatches = contractTmpl.match(/\/\/ \[\[SLOT:(\w+)\]\]/g) || [];
  const slots = slotMatches.map(m => m.match(/SLOT:(\w+)/)?.[1] || '').filter(Boolean);

  return {
    name: meta.name || baseName,
    description: meta.description || '',
    contract: contractTmpl,
    test: testTmpl,
    slots
  };
}

// Load module
function loadModule(modulePath: string): Module | null {
  const [category, moduleName] = modulePath.split('/');
  const modulesDir = path.join(process.cwd(), '..', '..', 'templates', 'buildable', 'modules');
  const fullPath = path.join(modulesDir, category, moduleName);

  if (!fs.existsSync(fullPath)) return null;

  const metaPath = path.join(fullPath, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  // Load inject files
  const injectDir = path.join(fullPath, 'inject');
  const inject: Record<string, string> = {};

  if (fs.existsSync(injectDir)) {
    const injectFiles = fs.readdirSync(injectDir);
    for (const file of injectFiles) {
      const slotName = file.replace('.sol', '').replace('.ts', '');
      inject[slotName] = fs.readFileSync(path.join(injectDir, file), 'utf-8');
    }
  }

  return {
    name: meta.name || moduleName,
    category,
    description: meta.description || '',
    inject,
    compatibleWith: meta.compatibleWith || []
  };
}

// Get available bases
function getAvailableBases(): string[] {
  const basesDir = path.join(process.cwd(), '..', '..', 'templates', 'buildable', 'projects');
  if (!fs.existsSync(basesDir)) return [];

  return fs.readdirSync(basesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

// Get available modules
function getAvailableModules(): string[] {
  const modulesDir = path.join(process.cwd(), '..', '..', 'templates', 'buildable', 'modules');
  if (!fs.existsSync(modulesDir)) return [];

  const modules: string[] = [];
  const categories = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const category of categories) {
    const categoryPath = path.join(modulesDir, category);
    const moduleNames = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const moduleName of moduleNames) {
      modules.push(`${category}/${moduleName}`);
    }
  }

  return modules;
}

// Merge base with modules
function mergeTemplates(base: BaseTemplate, modules: Module[], projectName: string): { contract: string; test: string } {
  let contract = base.contract;
  let test = base.test;

  // Replace project name placeholder
  contract = contract.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  contract = contract.replace(/\{\{ContractName\}\}/g, projectName);
  test = test.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  test = test.replace(/\{\{ContractName\}\}/g, projectName);

  // Inject modules into slots
  for (const module of modules) {
    for (const [slotName, content] of Object.entries(module.inject)) {
      const slotPattern = new RegExp(`// \\[\\[SLOT:${slotName}\\]\\]`, 'g');
      contract = contract.replace(slotPattern, content + `\n    // [[SLOT:${slotName}]]`);
    }
  }

  // Remove empty slots
  contract = contract.replace(/\/\/ \[\[SLOT:\w+\]\]\n?/g, '');

  return { contract, test };
}

// Base files for generated project
const baseFiles: Record<string, string> = {
  'hardhat.config.ts': `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;`,

  'package.json': `{
  "name": "fhevm-project",
  "version": "1.0.0",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "hardhat run scripts/deploy.ts"
  },
  "devDependencies": {
    "@fhevm/hardhat-plugin": "^0.1.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.0.0"
  }
}`,

  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": ["./hardhat.config.ts"]
}`,

  '.gitignore': `node_modules
.env
coverage
coverage.json
typechain
typechain-types
cache
artifacts
dist`
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base, projectName, modules: moduleNames = [] } = body;

    if (!base) {
      return NextResponse.json({ error: 'Base template is required' }, { status: 400 });
    }

    // Validate base exists
    const baseTemplate = loadBaseTemplate(base);
    if (!baseTemplate) {
      const availableBases = getAvailableBases();
      return NextResponse.json({
        error: `Base template "${base}" not found`,
        availableBases
      }, { status: 404 });
    }

    // Load and validate modules
    const modules: Module[] = [];
    const logs: string[] = [];

    logs.push(`Lab-Z v1.0.0`);
    logs.push(``);
    logs.push(`Building project: ${projectName || base}`);
    logs.push(`Base: ${base}`);

    if (moduleNames.length > 0) {
      logs.push(`Modules: ${moduleNames.join(', ')}`);
    }
    logs.push(``);

    // Validate modules
    logs.push(`Validating configuration...`);
    for (const moduleName of moduleNames) {
      const module = loadModule(moduleName);
      if (!module) {
        return NextResponse.json({
          error: `Module "${moduleName}" not found`,
          availableModules: getAvailableModules()
        }, { status: 404 });
      }

      // Check compatibility
      if (module.compatibleWith.length > 0 && !module.compatibleWith.includes(base)) {
        return NextResponse.json({
          error: `Module "${moduleName}" is not compatible with base "${base}"`,
          compatibleWith: module.compatibleWith
        }, { status: 400 });
      }

      modules.push(module);
      logs.push(`  [OK] ${moduleName}`);
    }
    logs.push(``);

    const finalProjectName = projectName || `${base}-project`;

    // Merge templates
    logs.push(`Merging templates...`);
    const merged = mergeTemplates(baseTemplate, modules, finalProjectName);
    logs.push(`  Base template loaded`);
    for (const module of modules) {
      logs.push(`  + Injected: ${module.name}`);
    }
    logs.push(``);

    // Generate files
    logs.push(`Generating files...`);

    const zip = new JSZip();

    // Add base files
    for (const [filename, content] of Object.entries(baseFiles)) {
      zip.file(filename, content.replace(/fhevm-project/g, finalProjectName));
      logs.push(`  + ${filename}`);
    }

    // Add contract
    zip.file(`contracts/${finalProjectName}.sol`, merged.contract);
    logs.push(`  + contracts/${finalProjectName}.sol`);

    // Add test
    if (merged.test) {
      zip.file(`test/${finalProjectName}.test.ts`, merged.test);
      logs.push(`  + test/${finalProjectName}.test.ts`);
    }

    // Add deploy script
    const deployScript = `import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("${finalProjectName}");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("${finalProjectName} deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;
    zip.file('scripts/deploy.ts', deployScript);
    logs.push(`  + scripts/deploy.ts`);

    // Add README
    const readme = `# ${finalProjectName}

Generated with [Lab-Z](https://github.com/Lab-Z)

## Configuration

- **Base**: ${base}
${modules.length > 0 ? `- **Modules**: ${modules.map(m => m.name).join(', ')}` : ''}

## Quick Start

\`\`\`bash
npm install
npx hardhat compile
npx hardhat test
\`\`\`
`;
    zip.file('README.md', readme);
    logs.push(`  + README.md`);

    logs.push(``);
    logs.push(`Build complete!`);
    logs.push(`Output: ${finalProjectName}.zip`);
    logs.push(``);
    logs.push(`Download ready! After extracting:`);
    logs.push(`  cd ${finalProjectName}`);
    logs.push(`  npm install`);
    logs.push(`  npx hardhat test`);
    logs.push(``);
    const moduleList = modules.map(m => m.name).join(' ');
    logs.push(`Or use the real CLI: npx labz build ${base}${moduleList ? ` --with ${moduleList}` : ''}`);

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipBase64 = zipBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      logs,
      projectName: finalProjectName,
      base,
      modules: modules.map(m => m.name),
      zip: zipBase64,
      fileName: `${finalProjectName}.zip`
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to list available bases and modules
export async function GET() {
  return NextResponse.json({
    bases: getAvailableBases(),
    modules: getAvailableModules()
  });
}
