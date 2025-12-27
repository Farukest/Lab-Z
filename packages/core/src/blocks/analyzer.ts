/**
 * Block Availability Analyzer
 *
 * Analyzes project state and determines which blocks are available,
 * suggested, or disabled based on current context.
 */

import { Block, ProjectState, ZoneType, ProjectBlock } from './types';
import { blocks, getBlockById } from './registry';
import { validateDrop } from './validator';

/**
 * Availability status for a single block
 */
export interface BlockAvailability {
  blockId: string;
  available: boolean;
  reason?: string;
  suggestedNext: boolean;
  suggestedReason?: string;
  applicableZones: ZoneType[];
  autoAddDeps?: string[];
  priority: number; // Higher = more relevant
}

/**
 * Analysis result for all blocks
 */
export interface AvailabilityAnalysis {
  blocks: Map<string, BlockAvailability>;
  suggestedBlocks: BlockAvailability[];
  stats: {
    total: number;
    available: number;
    suggested: number;
  };
}

/**
 * Get all blocks currently in the project
 */
function getAllProjectBlockIds(state: ProjectState): Set<string> {
  const ids = new Set<string>();

  state.imports.forEach(b => ids.add(b.blockId));
  state.stateVariables.forEach(b => ids.add(b.blockId));
  (state.constructorBody || []).forEach(b => ids.add(b.blockId));
  state.functions.forEach(f => f.body.forEach(b => ids.add(b.blockId)));
  state.modifiers.forEach(b => ids.add(b.blockId));

  return ids;
}

/**
 * Get available encrypted types from state variables
 */
function getAvailableTypes(state: ProjectState): string[] {
  const types: string[] = [];

  for (const stateVar of state.stateVariables) {
    const block = getBlockById(stateVar.blockId);
    if (block?.outputType) {
      types.push(block.outputType);
    }
  }

  return types;
}

/**
 * Check if a pattern matches available types
 */
function hasMatchingType(pattern: string, availableTypes: string[]): boolean {
  if (pattern.includes('*')) {
    const prefix = pattern.replace('*', '');
    return availableTypes.some(t => t.startsWith(prefix));
  }
  return availableTypes.includes(pattern);
}

/**
 * Check if block's input type requirements are met
 */
function checkTypeRequirements(block: Block, state: ProjectState): { met: boolean; reason?: string } {
  if (!block.inputTypes || block.inputTypes.length === 0) {
    return { met: true };
  }

  const availableTypes = getAvailableTypes(state);

  if (availableTypes.length === 0) {
    return {
      met: false,
      reason: 'No encrypted state variables defined yet'
    };
  }

  // Check if any input type pattern is satisfied
  for (const pattern of block.inputTypes) {
    const requiredTypes = pattern.split('+');
    const allMet = requiredTypes.every(t => hasMatchingType(t, availableTypes));
    if (allMet) {
      return { met: true };
    }
  }

  return {
    met: false,
    reason: `Requires type: ${block.inputTypes[0].replace('+', ' + ')}`
  };
}

/**
 * Check if block's dependencies are met
 */
function checkDependencies(block: Block, existingBlockIds: Set<string>): { met: boolean; reason?: string; missing?: string[] } {
  if (!block.requires || block.requires.length === 0) {
    return { met: true };
  }

  const missing: string[] = [];

  for (const dep of block.requires) {
    // Handle wildcards
    if (dep.includes('*')) {
      const prefix = dep.replace('*', '');
      const hasMatch = Array.from(existingBlockIds).some(id => id.startsWith(prefix));
      if (!hasMatch) {
        missing.push(dep);
      }
    } else {
      if (!existingBlockIds.has(dep)) {
        missing.push(dep);
      }
    }
  }

  if (missing.length > 0) {
    const missingNames = missing.map(id => {
      const b = getBlockById(id);
      return b?.name || id;
    });

    return {
      met: false,
      reason: `Requires: ${missingNames.join(', ')}`,
      missing
    };
  }

  return { met: true };
}

/**
 * Check if block conflicts with existing blocks
 */
function checkConflicts(block: Block, existingBlockIds: Set<string>): { hasConflict: boolean; reason?: string } {
  if (!block.incompatibleWith || block.incompatibleWith.length === 0) {
    return { hasConflict: false };
  }

  for (const conflict of block.incompatibleWith) {
    if (conflict.includes('*')) {
      const prefix = conflict.replace('*', '');
      const hasMatch = Array.from(existingBlockIds).some(id => id.startsWith(prefix));
      if (hasMatch) {
        return {
          hasConflict: true,
          reason: `Conflicts with existing ${prefix}* block`
        };
      }
    } else {
      if (existingBlockIds.has(conflict)) {
        const conflictBlock = getBlockById(conflict);
        return {
          hasConflict: true,
          reason: `Conflicts with ${conflictBlock?.name || conflict}`
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Check if import block is already added (imports are typically unique)
 */
function checkUniqueness(block: Block, existingBlockIds: Set<string>): { isUnique: boolean; reason?: string } {
  if (block.category === 'import' && existingBlockIds.has(block.id)) {
    return {
      isUnique: false,
      reason: 'Already imported'
    };
  }
  return { isUnique: true };
}

/**
 * Determine if block should be suggested as next step
 */
function shouldSuggest(
  block: Block,
  state: ProjectState,
  existingBlockIds: Set<string>
): { suggest: boolean; reason?: string; priority: number } {
  const hasImportFhe = existingBlockIds.has('import-fhe');
  const hasImportConfig = existingBlockIds.has('import-config');
  const stateVarCount = state.stateVariables.length;
  const hasFunctions = state.functions.length > 0;

  // Step 1: No imports yet - suggest import-fhe
  if (state.imports.length === 0 && block.id === 'import-fhe') {
    return { suggest: true, reason: 'Start with FHE import', priority: 100 };
  }

  // Step 2: Has import-fhe but no config - suggest import-config
  if (hasImportFhe && !hasImportConfig && block.id === 'import-config') {
    return { suggest: true, reason: 'Add network config', priority: 95 };
  }

  // Step 3: Has imports - suggest state blocks (continue suggesting even after some are added)
  if (hasImportFhe && block.category === 'state' && !existingBlockIds.has(block.id)) {
    // Prioritize based on how many state vars exist
    const priority = stateVarCount === 0 ? 80 : 70 - stateVarCount;
    const reason = stateVarCount === 0 ? 'Define encrypted state' : 'Add more state variables';
    return { suggest: true, reason, priority };
  }

  // Step 4: Inside a function - suggest based on flow
  if (hasFunctions) {
    const lastFn = state.functions[state.functions.length - 1];

    const hasInputConversion = lastFn.body.some(b => {
      const bl = getBlockById(b.blockId);
      return bl?.category === 'input-conversion';
    });

    const hasOperations = lastFn.body.some(b => {
      const bl = getBlockById(b.blockId);
      return bl?.category === 'arithmetic' || bl?.category === 'comparison';
    });

    const hasAcl = lastFn.body.some(b => {
      const bl = getBlockById(b.blockId);
      return bl?.category === 'acl';
    });

    // Empty function body - suggest input conversion first
    if (lastFn.body.length === 0 && block.category === 'input-conversion') {
      return { suggest: true, reason: 'Convert external input first', priority: 75 };
    }

    // Has input conversion but no operations
    if (hasInputConversion && !hasOperations && (block.category === 'arithmetic' || block.category === 'comparison')) {
      return { suggest: true, reason: 'Perform FHE operation', priority: 65 };
    }

    // Has operations but no ACL
    if (hasOperations && !hasAcl && block.category === 'acl') {
      return { suggest: true, reason: 'Set access permissions', priority: 55 };
    }
  }

  return { suggest: false, reason: '', priority: 0 };
}

/**
 * Analyze availability for a single block
 */
function analyzeBlock(
  block: Block,
  state: ProjectState,
  existingBlockIds: Set<string>,
  selectedFunctionId: string | null
): BlockAvailability {
  const result: BlockAvailability = {
    blockId: block.id,
    available: true,
    suggestedNext: false,
    applicableZones: [...block.canDropIn],
    priority: 0
  };

  // Check uniqueness (for imports)
  const uniqueCheck = checkUniqueness(block, existingBlockIds);
  if (!uniqueCheck.isUnique) {
    result.available = false;
    result.reason = uniqueCheck.reason;
    return result;
  }

  // Check dependencies
  const depCheck = checkDependencies(block, existingBlockIds);
  if (!depCheck.met) {
    result.available = false;
    result.reason = depCheck.reason;
    result.autoAddDeps = depCheck.missing;
    return result;
  }

  // Check conflicts
  const conflictCheck = checkConflicts(block, existingBlockIds);
  if (conflictCheck.hasConflict) {
    result.available = false;
    result.reason = conflictCheck.reason;
    return result;
  }

  // Check type requirements
  const typeCheck = checkTypeRequirements(block, state);
  if (!typeCheck.met) {
    // For function-body blocks, this might just be a warning
    if (block.canDropIn.includes('function-body')) {
      result.available = true; // Still available but with warning
      result.reason = typeCheck.reason;
    } else {
      result.available = false;
      result.reason = typeCheck.reason;
      return result;
    }
  }

  // Check zone applicability
  if (block.canDropIn.includes('function-body') && state.functions.length === 0) {
    result.available = false;
    result.reason = 'Create a function first';
    return result;
  }

  // Check if should be suggested
  const suggestion = shouldSuggest(block, state, existingBlockIds);
  result.suggestedNext = suggestion.suggest;
  result.suggestedReason = suggestion.reason;
  result.priority = suggestion.priority;

  return result;
}

/**
 * Main analysis function - analyzes all blocks against current state
 */
export function analyzeBlockAvailability(
  state: ProjectState,
  selectedFunctionId: string | null = null
): AvailabilityAnalysis {
  const existingBlockIds = getAllProjectBlockIds(state);
  const blockMap = new Map<string, BlockAvailability>();
  const suggested: BlockAvailability[] = [];

  let availableCount = 0;

  for (const block of blocks) {
    const availability = analyzeBlock(block, state, existingBlockIds, selectedFunctionId);
    blockMap.set(block.id, availability);

    if (availability.available) {
      availableCount++;
    }

    if (availability.suggestedNext) {
      suggested.push(availability);
    }
  }

  // Sort suggested by priority (highest first)
  suggested.sort((a, b) => b.priority - a.priority);

  return {
    blocks: blockMap,
    suggestedBlocks: suggested.slice(0, 5), // Top 5 suggestions
    stats: {
      total: blocks.length,
      available: availableCount,
      suggested: suggested.length
    }
  };
}

/**
 * Get suggested blocks for quick-add panel
 */
export function getSuggestedBlocks(state: ProjectState): Array<{ block: Block; reason: string }> {
  const analysis = analyzeBlockAvailability(state);

  return analysis.suggestedBlocks
    .map(avail => {
      const block = getBlockById(avail.blockId);
      if (!block) return null;
      return {
        block,
        reason: avail.suggestedReason || ''
      };
    })
    .filter((item): item is { block: Block; reason: string } => item !== null);
}

/**
 * Check if a specific block is available
 */
export function isBlockAvailable(
  blockId: string,
  state: ProjectState
): BlockAvailability | null {
  const block = getBlockById(blockId);
  if (!block) return null;

  const existingBlockIds = getAllProjectBlockIds(state);
  return analyzeBlock(block, state, existingBlockIds, null);
}
