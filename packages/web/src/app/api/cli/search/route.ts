import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface SearchResult {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  tags: string[];
  description: string;
  score: number; // Relevance score
  matchedIn: string[]; // Where the match was found
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

// Search templates
function searchTemplates(query: string): SearchResult[] {
  const templatesRoot = getTemplatesRoot();
  const categories = ['basics', 'encryption', 'decryption', 'acl', 'handles', 'advanced',
                      'anti-patterns', 'input-proofs', 'openzeppelin'];
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(Boolean);

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

        // Calculate relevance score
        let score = 0;
        const matchedIn: string[] = [];

        const id = (meta.id || item.name).toLowerCase();
        const name = (meta.name || item.name).toLowerCase();
        const description = (meta.description || '').toLowerCase();
        const tags = (meta.tags || []).map((t: string) => t.toLowerCase());
        const fheOps = (meta.fheOperations || []).map((t: string) => t.toLowerCase());

        for (const term of queryTerms) {
          // Exact ID match (highest priority)
          if (id === term) {
            score += 100;
            matchedIn.push('id (exact)');
          } else if (id.includes(term)) {
            score += 50;
            matchedIn.push('id');
          }

          // Name match
          if (name.includes(term)) {
            score += 40;
            matchedIn.push('name');
          }

          // Category match
          if (category.toLowerCase().includes(term)) {
            score += 30;
            matchedIn.push('category');
          }

          // Tag match
          if (tags.some((t: string) => t.includes(term))) {
            score += 25;
            matchedIn.push('tags');
          }

          // FHE operation match
          if (fheOps.some((op: string) => op.includes(term))) {
            score += 20;
            matchedIn.push('fheOperations');
          }

          // Description match (lower priority)
          if (description.includes(term)) {
            score += 10;
            matchedIn.push('description');
          }
        }

        if (score > 0) {
          results.push({
            id: meta.id || item.name,
            name: meta.name || item.name,
            category: meta.category || category,
            difficulty: meta.difficulty || 'intermediate',
            tags: meta.tags || [],
            description: meta.description || '',
            score,
            matchedIn: [...new Set(matchedIn)], // Remove duplicates
          });
        }
      } catch {
        // Skip invalid meta files
      }
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

// GET /api/cli/search?q=counter&limit=10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');

    if (!query.trim()) {
      return NextResponse.json({
        error: 'Search query is required. Use ?q=<keyword>',
        example: '/api/cli/search?q=counter',
      }, { status: 400 });
    }

    let results = searchTemplates(query);

    // Additional filters
    if (category) {
      results = results.filter(r =>
        r.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (difficulty) {
      results = results.filter(r =>
        r.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }

    // Apply limit
    const total = results.length;
    if (limit > 0) {
      results = results.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      query,
      total,
      showing: results.length,
      results,
      filters: { category, difficulty, limit },
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed',
    }, { status: 500 });
  }
}
