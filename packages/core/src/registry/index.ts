/**
 * Template Registry
 * Manages loading, caching, and querying templates
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import type {
  Template,
  TemplateMetadata,
  Category,
  Difficulty,
  RegistryStats,
  HubConfig,
  CATEGORIES,
} from '../types';

export class TemplateRegistry {
  private templates: Map<string, Template> = new Map();
  private config: HubConfig;
  private initialized = false;

  constructor(config: HubConfig) {
    this.config = config;
  }

  /**
   * Initialize the registry by loading all templates
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const metaFiles = await glob('**/meta.json', {
      cwd: this.config.templatesDir,
      absolute: true,
      ignore: ['**/_*/**', '**/node_modules/**', '**/buildable/**'],
    });

    for (const metaFile of metaFiles) {
      try {
        const template = await this.loadTemplate(metaFile);
        if (template) {
          this.templates.set(template.id, template);
        }
      } catch (error) {
        console.warn(`Failed to load template from ${metaFile}:`, error);
      }
    }

    this.initialized = true;
  }

  /**
   * Load a single template from its meta.json file
   */
  private async loadTemplate(metaPath: string): Promise<Template | null> {
    const templateDir = path.dirname(metaPath);
    const metaContent = await fs.readJson(metaPath);
    const metadata: TemplateMetadata = metaContent;

    // Find contract and test files
    const contractFiles = await glob('*.sol', { cwd: templateDir, absolute: true });
    const testFiles = await glob('*.test.ts', { cwd: templateDir, absolute: true });

    if (contractFiles.length === 0) {
      console.warn(`No contract file found in ${templateDir}`);
      return null;
    }

    const contractCode = await fs.readFile(contractFiles[0], 'utf-8');
    const testCode = testFiles.length > 0 ? await fs.readFile(testFiles[0], 'utf-8') : '';

    // Check for README
    const readmePath = path.join(templateDir, 'README.md');
    const readme = (await fs.pathExists(readmePath))
      ? await fs.readFile(readmePath, 'utf-8')
      : undefined;

    return {
      ...metadata,
      path: templateDir,
      contractCode,
      testCode,
      readme,
    };
  }

  /**
   * Get all templates
   */
  getAll(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  get(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by category
   */
  getByCategory(category: Category): Template[] {
    return this.getAll().filter((t) => t.category === category);
  }

  /**
   * Get templates by difficulty
   */
  getByDifficulty(difficulty: Difficulty): Template[] {
    return this.getAll().filter((t) => t.difficulty === difficulty);
  }

  /**
   * Get templates by tag
   */
  getByTag(tag: string): Template[] {
    return this.getAll().filter((t) => t.tags.includes(tag));
  }

  /**
   * Get templates matching multiple filters
   */
  filter(options: {
    category?: Category;
    difficulty?: Difficulty;
    tags?: string[];
  }): Template[] {
    let results = this.getAll();

    if (options.category) {
      results = results.filter((t) => t.category === options.category);
    }

    if (options.difficulty) {
      results = results.filter((t) => t.difficulty === options.difficulty);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter((t) =>
        options.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    return results;
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const templates = this.getAll();
    const byCategory: Record<Category, number> = {
      basics: 0,
      encryption: 0,
      decryption: 0,
      acl: 0,
      handles: 0,
      'input-proofs': 0,
      antipatterns: 0,
      security: 0,
      openzeppelin: 0,
      advanced: 0,
    };
    const byDifficulty: Record<Difficulty, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    const tagSet = new Set<string>();

    for (const template of templates) {
      byCategory[template.category]++;
      byDifficulty[template.difficulty]++;
      template.tags.forEach((tag) => tagSet.add(tag));
    }

    return {
      totalTemplates: templates.length,
      byCategory,
      byDifficulty,
      allTags: Array.from(tagSet).sort(),
    };
  }

  /**
   * Get all unique tags
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const template of this.templates.values()) {
      template.tags.forEach((tag) => tagSet.add(tag));
    }
    return Array.from(tagSet).sort();
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reload all templates
   */
  async reload(): Promise<void> {
    this.templates.clear();
    this.initialized = false;
    await this.init();
  }
}

/**
 * Create a registry instance with default config
 */
export function createRegistry(templatesDir: string, baseTemplatePath?: string): TemplateRegistry {
  return new TemplateRegistry({
    templatesDir,
    baseTemplatePath: baseTemplatePath || path.join(templatesDir, '_base'),
  });
}
