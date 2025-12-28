import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  tags: string[];
  description: string;
  fheOperations?: string[];
}

// Get templates root with multiple fallback paths
function getTemplatesRoot(): string {
  const possiblePaths = [
    path.join(process.cwd(), '..', '..', 'templates', 'creatable'),
    path.join(process.cwd(), 'templates', 'creatable'),
    path.join(__dirname, '..', '..', '..', '..', '..', '..', 'templates', 'creatable'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0];
}

// Load all templates with metadata
function loadAllTemplates(): TemplateInfo[] {
  const templatesRoot = getTemplatesRoot();
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];
  const templates: TemplateInfo[] = [];

  for (const category of categories) {
    const categoryPath = path.join(templatesRoot, category);
    if (!fs.existsSync(categoryPath)) continue;

    // Check subfolders
    const items = fs.readdirSync(categoryPath, { withFileTypes: true });

    for (const item of items) {
      if (!item.isDirectory()) continue;

      const templatePath = path.join(categoryPath, item.name);
      const metaPath = path.join(templatePath, 'meta.json');

      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          templates.push({
            id: meta.id || item.name,
            name: meta.name || item.name,
            category: meta.category || category,
            difficulty: meta.difficulty || 'intermediate',
            tags: meta.tags || [],
            description: meta.description || '',
            fheOperations: meta.fheOperations || [],
          });
        } catch {
          // Skip invalid meta files
        }
      }
    }
  }

  return templates;
}

// GET /api/cli/list?category=basics&difficulty=beginner&tag=euint64&limit=10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '0', 10);

    let templates = loadAllTemplates();

    // Filter by category
    if (category) {
      templates = templates.filter(t =>
        t.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by difficulty
    if (difficulty) {
      templates = templates.filter(t =>
        t.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }

    // Filter by tag
    if (tag) {
      templates = templates.filter(t =>
        t.tags.some(tt => tt.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    // Sort by difficulty order, then by name
    const difficultyOrder: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
    templates.sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty] || 4;
      const diffB = difficultyOrder[b.difficulty] || 4;
      if (diffA !== diffB) return diffA - diffB;
      return a.name.localeCompare(b.name);
    });

    // Apply limit
    if (limit > 0) {
      templates = templates.slice(0, limit);
    }

    // Group by category for display
    const grouped: Record<string, TemplateInfo[]> = {};
    for (const t of templates) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    }

    // Stats
    const stats = {
      total: templates.length,
      byCategory: Object.fromEntries(
        Object.entries(grouped).map(([cat, items]) => [cat, items.length])
      ),
      byDifficulty: templates.reduce((acc, t) => {
        acc[t.difficulty] = (acc[t.difficulty] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      success: true,
      templates,
      grouped,
      stats,
      filters: { category, difficulty, tag, limit },
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to list templates',
    }, { status: 500 });
  }
}
