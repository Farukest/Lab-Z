/**
 * Browser-Safe Block System Exports
 *
 * This file exports only browser-compatible code
 * (no Node.js fs, path, etc. dependencies)
 */

// Types
export * from './blocks/types';

// Block Registry (pure TypeScript, no Node.js)
export { blocks, getBlockById, getBlocksByCategory, searchBlocks, getCategories } from './blocks/registry';

// Validation (pure TypeScript, no Node.js)
export { validateDrop, getValidZones, validateProject } from './blocks/validator';

// Availability Analysis (pure TypeScript, no Node.js)
export {
  analyzeBlockAvailability,
  getSuggestedBlocks,
  isBlockAvailable,
  type BlockAvailability,
  type AvailabilityAnalysis
} from './blocks/analyzer';

// Code Generation (pure TypeScript, no Node.js)
export {
  generateContract,
  generateContractWithMapping,
  generateTest,
  generatePackageJson,
  generateHardhatConfig,
  generateDeployScript,
  generateProject,
  createEmptyProject,
  type BlockLineMapping,
  type GeneratedCodeWithMapping
} from './blocks/generator';
