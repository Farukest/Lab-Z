/**
 * Lab-Z - Main entry point
 * Combines registry, search, and generator into a single interface
 */

import * as path from 'path';
import { TemplateRegistry, createRegistry } from './registry';
import { SearchEngine, createSearchEngine } from './search';
import { ProjectGenerator, createGenerator } from './generator';
import type {
  Template,
  Category,
  Difficulty,
  SearchOptions,
  SearchResult,
  GeneratorOptions,
  GeneratorResult,
  RegistryStats,
  HubConfig,
} from './types';

export interface FHEVMHub {
  // Registry methods
  getTemplate(id: string): Template | undefined;
  getAllTemplates(): Template[];
  getTemplatesByCategory(category: Category): Template[];
  getTemplatesByDifficulty(difficulty: Difficulty): Template[];
  getTemplatesByTag(tag: string): Template[];
  getStats(): RegistryStats;
  getAllTags(): string[];

  // Search methods
  search(query: string, options?: SearchOptions): SearchResult[];
  suggest(partial: string, limit?: number): string[];
  getRelated(templateId: string, limit?: number): Template[];

  // Generator methods
  generate(options: GeneratorOptions): Promise<GeneratorResult>;
  generateDocs(templateId: string): string | null;

  // Lifecycle
  init(): Promise<void>;
  reload(): Promise<void>;
}

class Hub implements FHEVMHub {
  private registry: TemplateRegistry;
  private searchEngine: SearchEngine;
  private generator: ProjectGenerator;
  private config: HubConfig;
  private initialized = false;

  constructor(config: HubConfig) {
    this.config = config;
    this.registry = createRegistry(config.templatesDir, config.baseTemplatePath);
    this.searchEngine = createSearchEngine(this.registry);
    this.generator = createGenerator(this.registry, config);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.registry.init();
    await this.searchEngine.buildIndex();
    this.initialized = true;
  }

  async reload(): Promise<void> {
    await this.registry.reload();
    await this.searchEngine.rebuild();
  }

  // Registry methods
  getTemplate(id: string): Template | undefined {
    return this.registry.get(id);
  }

  getAllTemplates(): Template[] {
    return this.registry.getAll();
  }

  getTemplatesByCategory(category: Category): Template[] {
    return this.registry.getByCategory(category);
  }

  getTemplatesByDifficulty(difficulty: Difficulty): Template[] {
    return this.registry.getByDifficulty(difficulty);
  }

  getTemplatesByTag(tag: string): Template[] {
    return this.registry.getByTag(tag);
  }

  getStats(): RegistryStats {
    return this.registry.getStats();
  }

  getAllTags(): string[] {
    return this.registry.getAllTags();
  }

  // Search methods
  search(query: string, options?: SearchOptions): SearchResult[] {
    return this.searchEngine.search(query, options);
  }

  suggest(partial: string, limit?: number): string[] {
    return this.searchEngine.suggest(partial, limit);
  }

  getRelated(templateId: string, limit?: number): Template[] {
    return this.searchEngine.getRelated(templateId, limit);
  }

  // Generator methods
  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    return this.generator.generate(options);
  }

  generateDocs(templateId: string): string | null {
    const template = this.registry.get(templateId);
    if (!template) return null;
    return this.generator.generateDocs(template);
  }
}

/**
 * Create a new Lab-Z instance
 */
export function createHub(templatesDir: string, baseTemplatePath?: string): FHEVMHub {
  return new Hub({
    templatesDir,
    baseTemplatePath: baseTemplatePath || path.join(templatesDir, '_base'),
  });
}
