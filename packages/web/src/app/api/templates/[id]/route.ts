import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// Template types
interface CodeBlock {
  id: string;
  type: string;
  lines: [number, number];
  explanation: string;
  searchTerms: string[];
}

interface TemplateMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  tags: string[];
  description: string;
  longDescription?: string;
  blocks: CodeBlock[];
  files?: { path: string; source: string }[];
  fheOperations?: string[];
  fheTypes?: string[];
  relatedTemplates?: string[];
  prerequisites?: string[];
  nextSteps?: string[];
  sections?: { id: string; title: string; description: string }[];
}

interface Template extends TemplateMetadata {
  path: string;
  contractCode: string;
  testCode: string;
}

// Get templates directory
function getTemplatesDir(): string {
  const projectRoot = process.cwd().replace(/[/\\]packages[/\\]web$/, '');
  return path.join(projectRoot, 'templates', 'creatable');
}

async function loadTemplate(metaPath: string): Promise<Template | null> {
  try {
    const templateDir = path.dirname(metaPath);
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const metadata: TemplateMetadata = JSON.parse(metaContent);

    // Find contract and test files
    const files = await fs.readdir(templateDir);
    const contractFile = files.find(f => f.endsWith('.sol'));
    const testFile = files.find(f => f.endsWith('.test.ts'));

    if (!contractFile) {
      return null;
    }

    const contractCode = await fs.readFile(path.join(templateDir, contractFile), 'utf-8');
    const testCode = testFile
      ? await fs.readFile(path.join(templateDir, testFile), 'utf-8')
      : '';

    return {
      ...metadata,
      path: templateDir,
      contractCode,
      testCode,
    };
  } catch {
    return null;
  }
}

async function findTemplateById(templateId: string): Promise<Template | null> {
  const templatesDir = getTemplatesDir();

  // Find all meta.json files
  const metaFiles = await glob('**/meta.json', {
    cwd: templatesDir,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const metaFile of metaFiles) {
    const template = await loadTemplate(metaFile);
    if (template && template.id === templateId) {
      return template;
    }
  }

  // Try matching by folder name if id doesn't match directly
  for (const metaFile of metaFiles) {
    const templateDir = path.dirname(metaFile);
    const folderName = path.basename(templateDir);

    // Normalize for comparison
    const normalizedId = templateId.toLowerCase().replace(/-/g, '');
    const normalizedFolder = folderName.toLowerCase().replace(/-/g, '');

    if (normalizedId === normalizedFolder) {
      const template = await loadTemplate(metaFile);
      if (template) {
        return template;
      }
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await findTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: `Template "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Failed to load template:', error);
    return NextResponse.json(
      { error: 'Failed to load template' },
      { status: 500 }
    );
  }
}
