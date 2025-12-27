import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// Template types (matching core)
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
  files: { path: string; source: string }[];
  fheOperations?: string[];
  fheTypes?: string[];
  relatedTemplates?: string[];
  prerequisites?: string[];
  nextSteps?: string[];
}

interface Template extends TemplateMetadata {
  path: string;
  contractCode: string;
  testCode: string;
}

// Get templates directory (relative to project root)
function getTemplatesDir(): string {
  // In development, templates are in the project root
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
      console.warn(`No contract file found in ${templateDir}`);
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
  } catch (error) {
    console.warn(`Failed to load template from ${metaPath}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const templatesDir = getTemplatesDir();

    // Find all meta.json files
    const metaFiles = await glob('**/meta.json', {
      cwd: templatesDir,
      absolute: true,
      ignore: ['**/node_modules/**'],
    });

    const templates: Template[] = [];

    for (const metaFile of metaFiles) {
      const template = await loadTemplate(metaFile);
      if (template) {
        templates.push(template);
      }
    }

    // Sort by difficulty order, then by name
    const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
    templates.sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 4;
      const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 4;
      if (diffA !== diffB) return diffA - diffB;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      templates,
      stats: {
        total: templates.length,
        byCategory: templates.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byDifficulty: templates.reduce((acc, t) => {
          acc[t.difficulty] = (acc[t.difficulty] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }
    });
  } catch (error) {
    console.error('Failed to load templates:', error);
    return NextResponse.json(
      { error: 'Failed to load templates', templates: [], stats: { total: 0 } },
      { status: 500 }
    );
  }
}
