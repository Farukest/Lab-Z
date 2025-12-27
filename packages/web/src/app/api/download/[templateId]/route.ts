import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

// Base files for all projects
const baseFiles: Record<string, string> = {
  'hardhat.config.ts': `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;`,

  'package.json': `PLACEHOLDER_PACKAGE_JSON`,

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
dist`,

  'README.md': `# FHEVM Project

Generated with [Lab-Z](https://github.com/Lab-Z)

## Quick Start

\`\`\`bash
npm install
npx hardhat compile
npx hardhat test
\`\`\`

## Learn More

- [FHEVM Documentation](https://docs.fhevm.io)
- [Lab-Z Templates](https://github.com/Lab-Z)
`
};

// Get templates root with multiple fallback paths
function getTemplatesRoot(): string {
  const possiblePaths = [
    // When running from packages/web (pnpm dev)
    path.join(process.cwd(), '..', '..', 'templates', 'creatable'),
    // When running from project root
    path.join(process.cwd(), 'templates', 'creatable'),
    // Relative to this file (for production builds)
    path.join(__dirname, '..', '..', '..', '..', '..', '..', 'templates', 'creatable'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default fallback
  return possiblePaths[0];
}

// Find template in creatable folder
function findTemplate(templateId: string): { sol: string; test: string; meta: any } | null {
  const templatesRoot = getTemplatesRoot();

  // Search in all category folders
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];

  for (const category of categories) {
    const categoryPath = path.join(templatesRoot, category);
    if (!fs.existsSync(categoryPath)) continue;

    // First check if the category itself matches the templateId (for templates like input-proofs)
    if (category === templateId || category.replace(/-/g, '') === templateId.replace(/-/g, '')) {
      const solFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.sol'));
      if (solFiles.length > 0) {
        const solPath = path.join(categoryPath, solFiles[0]);
        const solContent = fs.readFileSync(solPath, 'utf-8');

        const testFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.test.ts'));
        const testPath = testFiles.length > 0 ? path.join(categoryPath, testFiles[0]) : null;
        const testContent = testPath ? fs.readFileSync(testPath, 'utf-8') : generateDefaultTest(solFiles[0].replace('.sol', ''));

        const metaPath = path.join(categoryPath, 'meta.json');
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          : { name: category, contractName: solFiles[0].replace('.sol', '') };

        return {
          sol: solContent,
          test: testContent,
          meta: {
            ...meta,
            contractName: solFiles[0].replace('.sol', ''),
            fileName: solFiles[0]
          }
        };
      }
    }

    // Then check subfolders
    const subfolders = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const subfolder of subfolders) {
      // Check if this folder matches the templateId
      // Also check with category prefix stripped (e.g., "handle-journey" -> "journey" in handles category)
      // Handle singular/plural variations (handles/handle, anti-patterns/antipattern)
      const categoryPrefixes = [
        category,
        category.replace(/-/g, ''),
        category.replace(/s$/, ''),  // handles -> handle
        category.replace(/-/g, '').replace(/s$/, '')  // anti-patterns -> antipattern
      ];
      let strippedId = templateId;
      for (const prefix of categoryPrefixes) {
        if (templateId.startsWith(prefix + '-')) {
          strippedId = templateId.slice(prefix.length + 1);
          break;
        }
      }

      if (subfolder === templateId ||
          subfolder === strippedId ||
          subfolder.replace(/-/g, '') === templateId.replace(/-/g, '') ||
          subfolder.replace(/-/g, '') === strippedId.replace(/-/g, '')) {
        const templatePath = path.join(categoryPath, subfolder);

        // Find .sol file
        const solFiles = fs.readdirSync(templatePath).filter(f => f.endsWith('.sol'));
        if (solFiles.length === 0) continue;

        const solPath = path.join(templatePath, solFiles[0]);
        const solContent = fs.readFileSync(solPath, 'utf-8');

        // Find .test.ts file
        const testFiles = fs.readdirSync(templatePath).filter(f => f.endsWith('.test.ts'));
        const testPath = testFiles.length > 0 ? path.join(templatePath, testFiles[0]) : null;
        const testContent = testPath ? fs.readFileSync(testPath, 'utf-8') : generateDefaultTest(solFiles[0].replace('.sol', ''));

        // Find meta.json
        const metaPath = path.join(templatePath, 'meta.json');
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          : { name: subfolder, contractName: solFiles[0].replace('.sol', '') };

        return {
          sol: solContent,
          test: testContent,
          meta: {
            ...meta,
            contractName: solFiles[0].replace('.sol', ''),
            fileName: solFiles[0]
          }
        };
      }
    }
  }

  return null;
}

// Generate a default test file if none exists
function generateDefaultTest(contractName: string): string {
  return `import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("${contractName}", function () {
  it("should deploy correctly", async function () {
    const factory = await ethers.getContractFactory("${contractName}");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    expect(address).to.be.properAddress;
  });
});
`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;

    // Get custom project name from query params
    const { searchParams } = new URL(request.url);
    const customName = searchParams.get('name');

    // Find template dynamically
    const template = findTemplate(templateId);

    if (!template) {
      return NextResponse.json({ error: `Template not found: ${templateId}` }, { status: 404 });
    }

  const zip = new JSZip();
  const projectName = customName || `${templateId}-project`;
  const contractName = template.meta.contractName;

  // Generate package.json with project name
  const packageJson = {
    name: projectName,
    version: "1.0.0",
    scripts: {
      compile: "hardhat compile",
      test: "hardhat test",
      deploy: "hardhat run scripts/deploy.ts"
    },
    devDependencies: {
      "@fhevm/hardhat-plugin": "^0.1.0",
      "@nomicfoundation/hardhat-toolbox": "^5.0.0",
      "hardhat": "^2.22.0",
      "typescript": "^5.0.0"
    }
  };

  // Add base files
  for (const [filename, content] of Object.entries(baseFiles)) {
    if (filename === 'package.json') {
      zip.file(filename, JSON.stringify(packageJson, null, 2));
    } else {
      zip.file(filename, content);
    }
  }

  // Add contract
  zip.file(`contracts/${contractName}.sol`, template.sol);

  // Add test
  zip.file(`test/${contractName}.test.ts`, template.test);

  // Add deploy script
  zip.file('scripts/deploy.ts', `import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("${contractName}");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("${contractName} deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`);

  // Generate ZIP
  const zipBuffer = await zip.generateAsync({ type: 'blob' });

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${projectName}.zip"`,
    },
  });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate project' },
      { status: 500 }
    );
  }
}
