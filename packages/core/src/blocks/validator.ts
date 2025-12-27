/**
 * Block Validation Engine
 *
 * Validates whether a block can be dropped in a specific zone
 */

import { Block, ProjectState, ValidationResult, ZoneType, ProjectBlock } from './types';
import { blocks, getBlockById } from './registry';

/**
 * Expand wildcards in block ID patterns
 * e.g., 'op-*' → ['op-add', 'op-sub', 'op-mul', ...]
 */
function expandWildcard(pattern: string): string[] {
  if (!pattern.includes('*')) {
    return [pattern];
  }

  const prefix = pattern.replace('*', '');
  return blocks.filter(b => b.id.startsWith(prefix)).map(b => b.id);
}

/**
 * Check if project has a block (by ID or pattern)
 */
function projectHasBlock(state: ProjectState, blockIdOrPattern: string): boolean {
  const blockIds = expandWildcard(blockIdOrPattern);

  const allBlocks = [
    ...state.imports,
    ...state.stateVariables,
    ...(state.constructorBody || []),
    ...state.functions.flatMap(f => f.body),
    ...state.modifiers
  ];

  return allBlocks.some(pb => blockIds.includes(pb.blockId));
}

/**
 * Get all block IDs in project
 */
function getAllProjectBlockIds(state: ProjectState): string[] {
  return [
    ...state.imports.map(b => b.blockId),
    ...state.stateVariables.map(b => b.blockId),
    ...(state.constructorBody || []).map(b => b.blockId),
    ...state.functions.flatMap(f => f.body.map(b => b.blockId)),
    ...state.modifiers.map(b => b.blockId)
  ];
}

/**
 * Get available variable types in project
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
 * Check if types match (including wildcards)
 */
function typesMatch(required: string, available: string[]): boolean {
  if (required.includes('*')) {
    const prefix = required.replace('*', '');
    return available.some(t => t.startsWith(prefix));
  }
  return available.includes(required);
}

/**
 * Get position of a block type in a zone
 */
function getBlockPosition(
  state: ProjectState,
  blockIdOrPattern: string,
  zoneType: ZoneType,
  functionId?: string
): number {
  const blockIds = expandWildcard(blockIdOrPattern);

  let blocks: ProjectBlock[] = [];

  switch (zoneType) {
    case 'imports':
      blocks = state.imports;
      break;
    case 'state':
      blocks = state.stateVariables;
      break;
    case 'function-body':
      if (functionId) {
        const fn = state.functions.find(f => f.id === functionId);
        blocks = fn?.body || [];
      }
      break;
    default:
      break;
  }

  for (let i = 0; i < blocks.length; i++) {
    if (blockIds.includes(blocks[i].blockId)) {
      return i;
    }
  }

  return -1;
}

/**
 * Main validation function
 */
export function validateDrop(
  block: Block,
  targetZone: ZoneType,
  dropPosition: number,
  state: ProjectState,
  functionId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const autoAdd: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 1: Zone Compatibility
  // ═══════════════════════════════════════════════════════════════════════
  if (!block.canDropIn.includes(targetZone)) {
    errors.push(`${block.name} cannot be placed in ${targetZone}`);
    return {
      valid: false,
      canDrop: false,
      errors,
      warnings
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 2: Dependencies (requires)
  // ═══════════════════════════════════════════════════════════════════════
  if (block.requires) {
    for (const dep of block.requires) {
      if (!projectHasBlock(state, dep)) {
        const depBlock = getBlockById(dep);
        if (depBlock) {
          // Auto-add suggestion instead of error
          autoAdd.push(dep);
          warnings.push(`Will auto-add: ${depBlock.name}`);
        } else {
          errors.push(`Requires ${dep}`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 3: Conflicts (incompatibleWith)
  // ═══════════════════════════════════════════════════════════════════════
  if (block.incompatibleWith) {
    for (const conflict of block.incompatibleWith) {
      if (projectHasBlock(state, conflict)) {
        const conflictBlock = getBlockById(conflict);
        errors.push(`Conflicts with ${conflictBlock?.name || conflict}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 4: Order - Must Come After
  // ═══════════════════════════════════════════════════════════════════════
  if (block.mustComeAfter && targetZone === 'function-body') {
    for (const afterPattern of block.mustComeAfter) {
      const afterBlockIds = expandWildcard(afterPattern);

      // Check if any of these blocks exist
      const hasRequired = afterBlockIds.some(id => projectHasBlock(state, id));

      if (hasRequired) {
        // Get the last position of required blocks
        let lastPos = -1;
        for (const id of afterBlockIds) {
          const pos = getBlockPosition(state, id, targetZone, functionId);
          if (pos > lastPos) lastPos = pos;
        }

        if (dropPosition <= lastPos) {
          errors.push(`${block.name} must come after ${afterPattern.replace('*', '...')}`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 5: Order - Must Come Before
  // ═══════════════════════════════════════════════════════════════════════
  if (block.mustComeBefore && targetZone === 'function-body') {
    for (const beforePattern of block.mustComeBefore) {
      const beforeBlockIds = expandWildcard(beforePattern);

      // Get the first position of blocked blocks
      let firstPos = Infinity;
      for (const id of beforeBlockIds) {
        const pos = getBlockPosition(state, id, targetZone, functionId);
        if (pos >= 0 && pos < firstPos) firstPos = pos;
      }

      if (firstPos !== Infinity && dropPosition >= firstPos) {
        errors.push(`${block.name} must come before ${beforePattern.replace('*', '...')}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RULE 6: Type Compatibility
  // ═══════════════════════════════════════════════════════════════════════
  if (block.inputTypes && block.inputTypes.length > 0) {
    const availableTypes = getAvailableTypes(state);

    // Check if at least one input type pattern is satisfied
    const hasCompatible = block.inputTypes.some(pattern => {
      // Pattern like 'euint32+euint32' or 'ebool'
      const requiredTypes = pattern.split('+');
      return requiredTypes.every(t => typesMatch(t, availableTypes));
    });

    if (!hasCompatible && availableTypes.length > 0) {
      warnings.push(`${block.name} may need compatible type: ${block.inputTypes[0]}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Auto-add suggestions
  // ═══════════════════════════════════════════════════════════════════════
  if (block.autoAdds) {
    for (const autoAddId of block.autoAdds) {
      if (!projectHasBlock(state, autoAddId)) {
        autoAdd.push(autoAddId);
      }
    }
  }

  return {
    valid: errors.length === 0,
    canDrop: errors.length === 0,
    errors,
    warnings,
    autoAdd: autoAdd.length > 0 ? autoAdd : undefined,
    insertPosition: dropPosition
  };
}

/**
 * Get all valid drop zones for a block
 */
export function getValidZones(block: Block, state: ProjectState): ZoneType[] {
  return block.canDropIn.filter(zone => {
    const result = validateDrop(block, zone, 0, state);
    return result.valid || result.errors.length === 0;
  });
}

/**
 * Validate entire project
 */
export function validateProject(state: ProjectState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check imports
  const hasImportFhe = state.imports.some(b => b.blockId === 'import-fhe');
  const hasImportConfig = state.imports.some(b => b.blockId === 'import-config');

  // Check if any FHE operations are used without import
  const usesFeOps = state.functions.some(f =>
    f.body.some(b => {
      const block = getBlockById(b.blockId);
      return block?.requires?.includes('import-fhe');
    })
  );

  if (usesFeOps && !hasImportFhe) {
    errors.push('FHE operations require import-fhe');
  }

  // Check each function
  for (const fn of state.functions) {
    // Check if function has ACL after operations
    const hasOperations = fn.body.some(b => {
      const block = getBlockById(b.blockId);
      return block?.category === 'arithmetic' || block?.category === 'comparison';
    });

    const hasAcl = fn.body.some(b => {
      const block = getBlockById(b.blockId);
      return block?.category === 'acl';
    });

    if (hasOperations && !hasAcl) {
      warnings.push(`Function ${fn.name}: Consider adding ACL operations after FHE operations`);
    }
  }

  return {
    valid: errors.length === 0,
    canDrop: true,
    errors,
    warnings
  };
}

/**
 * Get suggested next blocks based on current state
 */
export function getSuggestedBlocks(state: ProjectState, zoneType: ZoneType): Block[] {
  const suggestions: Block[] = [];
  const existingIds = getAllProjectBlockIds(state);

  for (const block of blocks) {
    // Skip if already exists (for unique blocks like imports)
    if (block.category === 'import' && existingIds.includes(block.id)) {
      continue;
    }

    // Check if can drop in this zone
    if (!block.canDropIn.includes(zoneType)) {
      continue;
    }

    // Check dependencies
    const depsOk = !block.requires || block.requires.every(dep =>
      projectHasBlock(state, dep)
    );

    if (depsOk) {
      suggestions.push(block);
    }
  }

  return suggestions;
}
