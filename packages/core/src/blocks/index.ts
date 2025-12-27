/**
 * Block System Exports
 *
 * Visual contract builder core functionality
 */

// Types
export * from './types';

// Block Registry
export { blocks, getBlockById, getBlocksByCategory, searchBlocks, getCategories } from './registry';

// Validation
export { validateDrop, getValidZones, validateProject } from './validator';

// Availability Analysis
export {
  analyzeBlockAvailability,
  getSuggestedBlocks,
  isBlockAvailable,
  type BlockAvailability,
  type AvailabilityAnalysis
} from './analyzer';

// Code Generation
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
} from './generator';
