import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import JSZip from 'jszip';

// Find template in creatable folder
function findTemplate(templateId: string): { sol: string; test: string; meta: any; solFileName: string } | null {
  const templatesRoot = path.join(process.cwd(), '..', '..', 'templates', 'creatable');
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];

  for (const category of categories) {
    const categoryPath = path.join(templatesRoot, category);
    if (!fs.existsSync(categoryPath)) continue;

    // Check if category itself matches
    if (category === templateId || category.replace(/-/g, '') === templateId.replace(/-/g, '')) {
      const solFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.sol'));
      if (solFiles.length > 0) {
        const solPath = path.join(categoryPath, solFiles[0]);
        const testFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.test.ts'));
        const testPath = testFiles.length > 0 ? path.join(categoryPath, testFiles[0]) : null;
        const metaPath = path.join(categoryPath, 'meta.json');

        return {
          sol: fs.readFileSync(solPath, 'utf-8'),
          test: testPath ? fs.readFileSync(testPath, 'utf-8') : generateDefaultTest(solFiles[0].replace('.sol', '')),
          meta: fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : { name: category },
          solFileName: solFiles[0]
        };
      }
    }

    // Check subfolders
    const subfolders = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const subfolder of subfolders) {
      const categoryPrefixes = [category, category.replace(/-/g, ''), category.replace(/s$/, ''), category.replace(/-/g, '').replace(/s$/, '')];
      let strippedId = templateId;
      for (const prefix of categoryPrefixes) {
        if (templateId.startsWith(prefix + '-')) {
          strippedId = templateId.slice(prefix.length + 1);
          break;
        }
      }

      if (subfolder === templateId || subfolder === strippedId ||
          subfolder.replace(/-/g, '') === templateId.replace(/-/g, '') ||
          subfolder.replace(/-/g, '') === strippedId.replace(/-/g, '')) {
        const templatePath = path.join(categoryPath, subfolder);
        const solFiles = fs.readdirSync(templatePath).filter(f => f.endsWith('.sol'));
        if (solFiles.length === 0) continue;

        const solPath = path.join(templatePath, solFiles[0]);
        const testFiles = fs.readdirSync(templatePath).filter(f => f.endsWith('.test.ts'));
        const testPath = testFiles.length > 0 ? path.join(templatePath, testFiles[0]) : null;
        const metaPath = path.join(templatePath, 'meta.json');

        return {
          sol: fs.readFileSync(solPath, 'utf-8'),
          test: testPath ? fs.readFileSync(testPath, 'utf-8') : generateDefaultTest(solFiles[0].replace('.sol', '')),
          meta: fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : { name: subfolder },
          solFileName: solFiles[0]
        };
      }
    }
  }
  return null;
}

function generateDefaultTest(contractName: string): string {
  return `import { expect } from "chai";
import { ethers } from "hardhat";

describe("${contractName}", function () {
  it("should deploy correctly", async function () {
    const factory = await ethers.getContractFactory("${contractName}");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    expect(await contract.getAddress()).to.be.properAddress;
  });
});
`;
}

// Get list of valid templates
function getValidTemplates(): string[] {
  const templatesRoot = path.join(process.cwd(), '..', '..', 'templates', 'creatable');
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];
  const templates: string[] = [];

  for (const category of categories) {
    const categoryPath = path.join(templatesRoot, category);
    if (!fs.existsSync(categoryPath)) continue;

    // Check if category has .sol files directly
    const solFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.sol'));
    if (solFiles.length > 0) {
      templates.push(category);
    }

    // Check subfolders
    const subfolders = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    templates.push(...subfolders);
  }

  return templates;
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
    const { template, projectName } = body;

    if (!template) {
      return NextResponse.json({ error: 'Template is required' }, { status: 400 });
    }

    // Validate template exists (whitelist check)
    const validTemplates = getValidTemplates();
    const templateData = findTemplate(template);

    if (!templateData) {
      return NextResponse.json({
        error: `Template "${template}" not found`,
        validTemplates: validTemplates.slice(0, 20)
      }, { status: 404 });
    }

    const contractName = templateData.solFileName.replace('.sol', '');
    const finalProjectName = projectName || `${template}-project`;

    // Build progress log
    const logs: string[] = [];
    logs.push(`Lab-Z v1.0.0`);
    logs.push(``);
    logs.push(`Creating project: ${finalProjectName}`);
    logs.push(`Template: ${template}`);
    logs.push(``);
    logs.push(`Generating files...`);

    // Create ZIP
    const zip = new JSZip();

    // Add base files
    for (const [filename, content] of Object.entries(baseFiles)) {
      zip.file(filename, content.replace(/fhevm-project/g, finalProjectName));
      logs.push(`  + ${filename}`);
    }

    // Add contract
    zip.file(`contracts/${contractName}.sol`, templateData.sol);
    logs.push(`  + contracts/${contractName}.sol`);

    // Add test
    zip.file(`test/${contractName}.test.ts`, templateData.test);
    logs.push(`  + test/${contractName}.test.ts`);

    // Add deploy script
    const deployScript = `import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("${contractName}");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("${contractName} deployed to:", await contract.getAddress());
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

## Quick Start

\`\`\`bash
npm install
npx hardhat compile
npx hardhat test
\`\`\`

## Contract: ${contractName}

Template: ${template}
`;
    zip.file('README.md', readme);
    logs.push(`  + README.md`);

    logs.push(``);
    logs.push(`Project created successfully!`);
    logs.push(`Output: ${finalProjectName}.zip`);
    logs.push(``);
    logs.push(`Download ready! After extracting:`);
    logs.push(`  cd ${finalProjectName}`);
    logs.push(`  npm install`);
    logs.push(`  npx hardhat test`);
    logs.push(``);
    logs.push(`Or use the real CLI: npx labz create ${template} ${projectName}`);

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipBase64 = zipBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      logs,
      projectName: finalProjectName,
      contractName,
      zip: zipBase64,
      fileName: `${finalProjectName}.zip`
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to list available templates
export async function GET() {
  const templates = getValidTemplates();
  return NextResponse.json({ templates });
}
