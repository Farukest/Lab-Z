/**
 * Lab-Z Core
 * Shared engine for CLI and Web UI
 */

// Types
export * from './types';

// Registry
export { TemplateRegistry, createRegistry } from './registry';

// Search
export { SearchEngine, createSearchEngine } from './search';
export type { SearchableTemplate } from './search';

// Generator
export { ProjectGenerator, createGenerator } from './generator';

// Utility functions
export { createHub, type FHEVMHub } from './hub';

// Block System (Visual Contract Builder)
export * from './blocks';
