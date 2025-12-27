/**
 * Search Engine
 * Fuzzy search across templates with intelligent matching
 */

import Fuse from 'fuse.js';
import type {
  Template,
  SearchOptions,
  SearchResult,
  CodeBlock,
  Category,
  Difficulty,
} from '../types';
import type { TemplateRegistry } from '../registry';

export interface SearchableTemplate {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  description: string;
  longDescription?: string;
  tags: string[];
  searchableBlocks: string;
  searchableCode: string;
  template: Template;
}

export class SearchEngine {
  private fuse: Fuse<SearchableTemplate> | null = null;
  private searchableData: SearchableTemplate[] = [];
  private registry: TemplateRegistry;

  constructor(registry: TemplateRegistry) {
    this.registry = registry;
  }

  /**
   * Build the search index from templates
   */
  async buildIndex(): Promise<void> {
    const templates = this.registry.getAll();
    this.searchableData = templates.map((template) => this.toSearchable(template));

    this.fuse = new Fuse(this.searchableData, {
      keys: [
        { name: 'name', weight: 2.0 },
        { name: 'tags', weight: 1.8 },
        { name: 'description', weight: 1.5 },
        { name: 'searchableBlocks', weight: 1.2 },
        { name: 'searchableCode', weight: 0.8 },
        { name: 'longDescription', weight: 0.6 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
    });
  }

  /**
   * Convert template to searchable format
   */
  private toSearchable(template: Template): SearchableTemplate {
    // Combine all block explanations and search terms
    const blocks = template.blocks || [];
    const searchableBlocks = blocks
      .map((block) => [block.explanation, ...(block.searchTerms || [])].join(' '))
      .join(' ');

    // Extract searchable content from code
    const searchableCode = this.extractCodeKeywords(template.contractCode);

    return {
      id: template.id,
      name: template.name,
      category: template.category,
      difficulty: template.difficulty,
      description: template.description,
      longDescription: template.longDescription,
      tags: template.tags,
      searchableBlocks,
      searchableCode,
      template,
    };
  }

  /**
   * Extract keywords from code for searching
   */
  private extractCodeKeywords(code: string): string {
    // Extract function names, variable names, and important keywords
    const functionMatches = code.match(/function\s+(\w+)/g) || [];
    const fheMatches = code.match(/FHE\.\w+/g) || [];
    const typeMatches = code.match(/euint\d+|ebool|eaddress/g) || [];
    const eventMatches = code.match(/event\s+(\w+)/g) || [];

    return [...functionMatches, ...fheMatches, ...typeMatches, ...eventMatches].join(' ');
  }

  /**
   * Search templates
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!this.fuse) {
      throw new Error('Search index not built. Call buildIndex() first.');
    }

    // Perform fuzzy search
    let results = this.fuse.search(query);

    // Apply filters
    if (options.category) {
      results = results.filter((r) => r.item.category === options.category);
    }

    if (options.difficulty) {
      results = results.filter((r) => r.item.difficulty === options.difficulty);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter((r) =>
        options.tags!.some((tag) => r.item.tags.includes(tag))
      );
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    // Convert to SearchResult format
    return results.map((result) => {
      const searchResult: SearchResult = {
        template: result.item.template,
        score: 1 - (result.score || 0), // Convert to 0-1 where 1 is best
      };

      // Find matched blocks if requested
      if (options.includeBlocks && result.matches) {
        const blockMatches = result.matches.filter(
          (m) => m.key === 'searchableBlocks'
        );
        if (blockMatches.length > 0) {
          searchResult.matchedBlocks = this.findMatchingBlocks(
            result.item.template,
            query
          );
        }
      }

      // Add highlights
      if (result.matches) {
        searchResult.highlights = result.matches.map((match) => ({
          field: match.key || '',
          value: match.value || '',
        }));
      }

      return searchResult;
    });
  }

  /**
   * Find blocks that match the query
   */
  private findMatchingBlocks(template: Template, query: string): CodeBlock[] {
    const queryLower = query.toLowerCase();
    const blocks = template.blocks || [];
    return blocks.filter((block) => {
      const blockText = [block.explanation, ...(block.searchTerms || [])]
        .join(' ')
        .toLowerCase();
      return blockText.includes(queryLower);
    });
  }

  /**
   * Get autocomplete suggestions
   */
  suggest(partial: string, limit = 10): string[] {
    if (!partial || partial.length < 2) return [];

    const suggestions = new Set<string>();
    const partialLower = partial.toLowerCase();

    // Search through tags, names, and common terms
    for (const item of this.searchableData) {
      // Match tags
      item.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(partialLower)) {
          suggestions.add(tag);
        }
      });

      // Match name
      if (item.name.toLowerCase().includes(partialLower)) {
        suggestions.add(item.name);
      }

      // Match blocks search terms
      (item.template.blocks || []).forEach((block) => {
        (block.searchTerms || []).forEach((term) => {
          if (term.toLowerCase().includes(partialLower)) {
            suggestions.add(term);
          }
        });
      });
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get related templates based on tags and category
   */
  getRelated(templateId: string, limit = 5): Template[] {
    const template = this.registry.get(templateId);
    if (!template) return [];

    const scores = new Map<string, number>();

    for (const other of this.registry.getAll()) {
      if (other.id === templateId) continue;

      let score = 0;

      // Same category = +3
      if (other.category === template.category) {
        score += 3;
      }

      // Shared tags = +1 each
      const sharedTags = template.tags.filter((t) => other.tags.includes(t));
      score += sharedTags.length;

      // Similar difficulty = +1
      if (other.difficulty === template.difficulty) {
        score += 1;
      }

      // Explicit relations
      if (template.relatedTemplates?.includes(other.id)) {
        score += 5;
      }

      if (score > 0) {
        scores.set(other.id, score);
      }
    }

    // Sort by score and return top N
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.registry.get(id)!)
      .filter(Boolean);
  }

  /**
   * Rebuild the search index
   */
  async rebuild(): Promise<void> {
    await this.buildIndex();
  }
}

/**
 * Create a search engine instance
 */
export function createSearchEngine(registry: TemplateRegistry): SearchEngine {
  return new SearchEngine(registry);
}
