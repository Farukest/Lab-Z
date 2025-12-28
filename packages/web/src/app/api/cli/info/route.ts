import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface CodeBlock {
  id: string;
  type: string;
  lines: [number, number];
  explanation: string;
}

interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  tags: string[];
  description: string;
  longDescription?: string;
  fheOperations: string[];
  fheTypes: string[];
  blocks: CodeBlock[];
  contractCode: string;
  testCode: string;
  contractLines: number;
  testLines: number;
  relatedTemplates?: string[];
  prerequisites?: string[];
  nextSteps?: string[];
  cliCommand: string;
}

// Get templates root
function getTemplatesRoot(): string {
  const possiblePaths = [
    path.join(process.cwd(), '..', '..', 'templates', 'creatable'),
    path.join(process.cwd(), 'templates', 'creatable'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

// Find and load template with full details
function loadTemplateInfo(templateId: string): TemplateInfo | null {
  const templatesRoot = getTemplatesRoot();
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];

  for (const category of categories) {
    const categoryPath = path.join(templatesRoot, category);
    if (!fs.existsSync(categoryPath)) continue;

    const items = fs.readdirSync(categoryPath, { withFileTypes: true });

    for (const item of items) {
      if (!item.isDirectory()) continue;

      const templatePath = path.join(categoryPath, item.name);
      const metaPath = path.join(templatePath, 'meta.json');

      if (!fs.existsSync(metaPath)) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const id = meta.id || item.name;

        // Check if this is the template we're looking for
        if (id !== templateId &&
            item.name !== templateId &&
            id.replace(/-/g, '') !== templateId.replace(/-/g, '')) {
          continue;
        }

        // Find contract and test files
        const files = fs.readdirSync(templatePath);
        const contractFile = files.find(f => f.endsWith('.sol'));
        const testFile = files.find(f => f.endsWith('.test.ts'));

        const contractCode = contractFile
          ? fs.readFileSync(path.join(templatePath, contractFile), 'utf-8')
          : '';
        const testCode = testFile
          ? fs.readFileSync(path.join(templatePath, testFile), 'utf-8')
          : '';

        // Extract FHE operations from contract code
        const fheOperations = extractFHEOperations(contractCode);
        const fheTypes = extractFHETypes(contractCode);

        return {
          id,
          name: meta.name || item.name,
          category: meta.category || category,
          difficulty: meta.difficulty || 'intermediate',
          tags: meta.tags || [],
          description: meta.description || '',
          longDescription: meta.longDescription,
          fheOperations,
          fheTypes,
          blocks: meta.blocks || [],
          contractCode,
          testCode,
          contractLines: contractCode.split('\n').length,
          testLines: testCode.split('\n').length,
          relatedTemplates: meta.relatedTemplates,
          prerequisites: meta.prerequisites,
          nextSteps: meta.nextSteps,
          cliCommand: `npx labz create ${id} my-${id}-project`,
        };
      } catch {
        // Skip invalid meta files
      }
    }
  }

  return null;
}

// Extract FHE operations from contract code
function extractFHEOperations(code: string): string[] {
  const operations = new Set<string>();

  // Match FHE.xxx patterns
  const fheMatches = code.matchAll(/FHE\.(\w+)/g);
  for (const match of fheMatches) {
    operations.add(`FHE.${match[1]}`);
  }

  return Array.from(operations).sort();
}

// Extract FHE types from contract code
function extractFHETypes(code: string): string[] {
  const types = new Set<string>();

  // Match encrypted types
  const typePatterns = [
    /\b(ebool)\b/g,
    /\b(euint8)\b/g,
    /\b(euint16)\b/g,
    /\b(euint32)\b/g,
    /\b(euint64)\b/g,
    /\b(euint128)\b/g,
    /\b(euint256)\b/g,
    /\b(eaddress)\b/g,
    /\b(externalEbool)\b/g,
    /\b(externalEuint\d+)\b/g,
    /\b(externalEaddress)\b/g,
  ];

  for (const pattern of typePatterns) {
    const matches = code.matchAll(pattern);
    for (const match of matches) {
      types.add(match[1]);
    }
  }

  return Array.from(types).sort();
}

// GET /api/cli/info?id=counter or /api/cli/info?id=counter&code=true&blocks=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id') || searchParams.get('template') || '';
    const includeCode = searchParams.get('code') !== 'false';
    const includeBlocks = searchParams.get('blocks') !== 'false';

    if (!templateId.trim()) {
      return NextResponse.json({
        error: 'Template ID is required. Use ?id=<template-id>',
        example: '/api/cli/info?id=counter',
      }, { status: 400 });
    }

    const info = loadTemplateInfo(templateId);

    if (!info) {
      return NextResponse.json({
        error: `Template not found: ${templateId}`,
        suggestion: 'Use /api/cli/search?q=<keyword> to find templates',
      }, { status: 404 });
    }

    // Optionally exclude code to reduce payload size
    const response: any = {
      success: true,
      template: {
        ...info,
        contractCode: includeCode ? info.contractCode : undefined,
        testCode: includeCode ? info.testCode : undefined,
        blocks: includeBlocks ? info.blocks : undefined,
      },
      summary: {
        lines: {
          contract: info.contractLines,
          test: info.testLines,
          total: info.contractLines + info.testLines,
        },
        fheOperations: info.fheOperations.length,
        fheTypes: info.fheTypes.length,
        blocks: info.blocks.length,
      },
    };

    // Remove undefined fields
    if (!includeCode) {
      delete response.template.contractCode;
      delete response.template.testCode;
    }
    if (!includeBlocks) {
      delete response.template.blocks;
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get template info',
    }, { status: 500 });
  }
}
