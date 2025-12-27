/**
 * Validation Pipeline
 *
 * Validates compatibility between base templates and modules.
 */

import type {
  BaseTemplate,
  Module,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  MergeOptions
} from './types';
import { parseTemplate } from './parser';

const MAX_CONTRACT_SIZE = 24 * 1024; // 24KB Solidity limit
const WARN_CONTRACT_SIZE = 20 * 1024; // Warn at 20KB

/**
 * Run full validation pipeline
 */
export function validate(
  base: BaseTemplate,
  modules: Module[],
  options?: { typeParams?: { [key: string]: string } }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Phase 1: Base Compatibility
  const baseCompatErrors = validateBaseCompatibility(base, modules);
  errors.push(...baseCompatErrors);

  // Phase 2: Module Compatibility (pairwise)
  const moduleCompatErrors = validateModuleCompatibility(modules);
  errors.push(...moduleCompatErrors);

  // Phase 3: Dependency Resolution
  const depErrors = validateDependencies(modules);
  errors.push(...depErrors);

  // Phase 4: Slot Validation
  const slotErrors = validateSlots(base, modules);
  errors.push(...slotErrors);

  // Phase 5: Type Validation
  if (options?.typeParams) {
    const typeErrors = validateTypes(base, modules, options.typeParams);
    errors.push(...typeErrors);
  }

  // Phase 6: Name Collision Check
  const collisionErrors = validateNameCollisions(base, modules);
  errors.push(...collisionErrors);

  // Phase 7: Exclusivity Check
  const exclusivityErrors = validateExclusivity(modules);
  errors.push(...exclusivityErrors);

  // Phase 8: Size Estimation
  const sizeWarnings = validateSize(base, modules);
  warnings.push(...sizeWarnings);

  // Phase 9: Semantic Conflict Check
  const semanticWarnings = validateSemantics(modules);
  warnings.push(...semanticWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Phase 1: Check if each module is compatible with the base
 */
function validateBaseCompatibility(
  base: BaseTemplate,
  modules: Module[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const module of modules) {
    // Check compatibleWith list
    if (module.compatibleWith.length > 0 && !module.compatibleWith.includes(base.name)) {
      errors.push({
        type: 'compatibility',
        message: `Module "${module.name}" is not compatible with base "${base.name}"`,
        module: module.name,
        suggestion: `Compatible bases: ${module.compatibleWith.join(', ')}`
      });
    }
  }

  return errors;
}

/**
 * Phase 2: Check pairwise module compatibility
 */
function validateModuleCompatibility(modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const modA = modules[i];
      const modB = modules[j];

      // Check incompatibleWith lists
      if (modA.incompatibleWith.includes(modB.name)) {
        errors.push({
          type: 'compatibility',
          message: `Module "${modA.name}" is incompatible with "${modB.name}"`,
          module: modA.name,
          suggestion: `Remove one of these modules`
        });
      }

      if (modB.incompatibleWith.includes(modA.name)) {
        errors.push({
          type: 'compatibility',
          message: `Module "${modB.name}" is incompatible with "${modA.name}"`,
          module: modB.name,
          suggestion: `Remove one of these modules`
        });
      }
    }
  }

  return errors;
}

/**
 * Phase 3: Validate dependencies
 */
function validateDependencies(modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const moduleNames = new Set(modules.map(m => m.name));

  // Check for missing dependencies
  for (const module of modules) {
    for (const dep of module.requires) {
      if (!moduleNames.has(dep)) {
        errors.push({
          type: 'dependency',
          message: `Module "${module.name}" requires "${dep}" which is not included`,
          module: module.name,
          suggestion: `Add --with ${dep}`
        });
      }
    }
  }

  // Check for circular dependencies
  const circularError = detectCircularDependencies(modules);
  if (circularError) {
    errors.push(circularError);
  }

  return errors;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(modules: Module[]): ValidationError | null {
  const moduleMap = new Map(modules.map(m => [m.name, m]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(moduleName: string): string[] | null {
    if (recursionStack.has(moduleName)) {
      // Found cycle - return the cycle path
      const cycleStart = path.indexOf(moduleName);
      return path.slice(cycleStart);
    }

    if (visited.has(moduleName)) {
      return null;
    }

    const module = moduleMap.get(moduleName);
    if (!module) {
      return null;
    }

    visited.add(moduleName);
    recursionStack.add(moduleName);
    path.push(moduleName);

    for (const dep of module.requires) {
      const cycle = dfs(dep);
      if (cycle) {
        return cycle;
      }
    }

    recursionStack.delete(moduleName);
    path.pop();
    return null;
  }

  for (const module of modules) {
    const cycle = dfs(module.name);
    if (cycle) {
      return {
        type: 'dependency',
        message: `Circular dependency detected: ${cycle.join(' -> ')} -> ${cycle[0]}`,
        suggestion: 'Remove one of the modules in the cycle'
      };
    }
  }

  return null;
}

/**
 * Phase 4: Validate required slots exist in base
 */
function validateSlots(base: BaseTemplate, modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get all available slots from base template files
  const availableSlots = new Set<string>();
  for (const content of Object.values(base.files)) {
    const parsed = parseTemplate(content);
    for (const slot of parsed.slots) {
      availableSlots.add(slot.name);
    }
  }

  // Also add slots from base meta
  for (const slot of base.slots) {
    availableSlots.add(slot.name);
  }

  // Check each module's required slots
  for (const module of modules) {
    for (const requiredSlot of module.requiresSlots) {
      if (!availableSlots.has(requiredSlot)) {
        errors.push({
          type: 'slot',
          message: `Module "${module.name}" requires slot "{{${requiredSlot}}}" which doesn't exist in base "${base.name}"`,
          module: module.name,
          suggestion: `Check if this module is compatible with base "${base.name}"`
        });
      }
    }
  }

  return errors;
}

/**
 * Phase 5: Validate type requirements
 */
function validateTypes(
  base: BaseTemplate,
  modules: Module[],
  typeParams: { [key: string]: string }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check that provided type params are valid for base
  for (const [param, value] of Object.entries(typeParams)) {
    const paramDef = base.typeParams[param];
    if (!paramDef) {
      errors.push({
        type: 'type',
        message: `Unknown type parameter "${param}" for base "${base.name}"`,
        suggestion: `Available type params: ${Object.keys(base.typeParams).join(', ')}`
      });
    } else if (paramDef.options && !paramDef.options.includes(value)) {
      errors.push({
        type: 'type',
        message: `Invalid value "${value}" for type parameter "${param}"`,
        suggestion: `Valid options: ${paramDef.options.join(', ')}`
      });
    }
  }

  // Check module type requirements
  const effectiveTypes = new Set<string>();
  for (const [param, paramDef] of Object.entries(base.typeParams)) {
    effectiveTypes.add(typeParams[param] || paramDef.default);
  }

  for (const module of modules) {
    if (module.requiresTypes && module.requiresTypes.length > 0) {
      const hasRequiredType = module.requiresTypes.some(t => effectiveTypes.has(t));
      if (!hasRequiredType) {
        errors.push({
          type: 'type',
          message: `Module "${module.name}" requires one of: ${module.requiresTypes.join(', ')}`,
          module: module.name,
          suggestion: `Set type parameter to match module requirements`
        });
      }
    }
  }

  return errors;
}

/**
 * Phase 6: Check for name collisions between base and modules
 */
function validateNameCollisions(base: BaseTemplate, modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Track all names with their sources
  const stateVars = new Map<string, string>(); // name -> source
  const functions = new Map<string, string>();
  const modifiers = new Map<string, string>();
  const events = new Map<string, string>();
  const customErrors = new Map<string, string>();

  // Add base names
  for (const v of base.exposes.variables || []) {
    stateVars.set(v, `base:${base.name}`);
  }
  for (const f of base.exposes.functions || []) {
    functions.set(f, `base:${base.name}`);
  }
  for (const e of base.exposes.events || []) {
    events.set(e, `base:${base.name}`);
  }

  // Check each module
  for (const module of modules) {
    const provides = module.provides || {};

    // Check state variables
    for (const v of provides.stateVariables || []) {
      if (stateVars.has(v)) {
        const source = stateVars.get(v)!;
        errors.push({
          type: 'collision',
          message: `Variable "${v}" already defined by ${source}`,
          module: module.name,
          suggestion: `Module "${module.name}" cannot be used with ${source} (duplicate variable)`
        });
      } else {
        stateVars.set(v, module.name);
      }
    }

    // Check functions
    for (const f of provides.functions || []) {
      if (functions.has(f)) {
        const source = functions.get(f)!;
        errors.push({
          type: 'collision',
          message: `Function "${f}()" already defined by ${source}`,
          module: module.name,
          suggestion: `Module "${module.name}" cannot be used with ${source} (duplicate function)`
        });
      } else {
        functions.set(f, module.name);
      }
    }

    // Check modifiers
    for (const m of provides.modifiers || []) {
      if (modifiers.has(m)) {
        const source = modifiers.get(m)!;
        errors.push({
          type: 'collision',
          message: `Modifier "${m}" already defined by ${source}`,
          module: module.name,
          suggestion: `Module "${module.name}" cannot be used with ${source} (duplicate modifier)`
        });
      } else {
        modifiers.set(m, module.name);
      }
    }

    // Check events
    for (const e of provides.events || []) {
      if (events.has(e)) {
        const source = events.get(e)!;
        errors.push({
          type: 'collision',
          message: `Event "${e}" already defined by ${source}`,
          module: module.name,
          suggestion: `Module "${module.name}" cannot be used with ${source} (duplicate event)`
        });
      } else {
        events.set(e, module.name);
      }
    }

    // Check custom errors
    for (const err of provides.errors || []) {
      if (customErrors.has(err)) {
        const source = customErrors.get(err)!;
        errors.push({
          type: 'collision',
          message: `Error "${err}" already defined by ${source}`,
          module: module.name,
          suggestion: `Module "${module.name}" cannot be used with ${source} (duplicate error)`
        });
      } else {
        customErrors.set(err, module.name);
      }
    }
  }

  return errors;
}

/**
 * Phase 7: Check category exclusivity
 */
function validateExclusivity(modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const exclusiveByCategory = new Map<string, Module[]>();

  for (const module of modules) {
    if (module.exclusive) {
      const existing = exclusiveByCategory.get(module.category) || [];
      existing.push(module);
      exclusiveByCategory.set(module.category, existing);
    }
  }

  for (const [category, mods] of exclusiveByCategory) {
    if (mods.length > 1) {
      errors.push({
        type: 'exclusivity',
        message: `Category "${category}" allows only one module, but found: ${mods.map(m => m.name).join(', ')}`,
        suggestion: 'Keep only one module from this category'
      });
    }
  }

  return errors;
}

/**
 * Phase 8: Size estimation warnings
 */
function validateSize(base: BaseTemplate, modules: Module[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Estimate base size (rough: characters * 0.6)
  let estimatedSize = 0;
  for (const content of Object.values(base.files)) {
    estimatedSize += content.length * 0.6;
  }

  // Add module sizes
  for (const module of modules) {
    if (module.estimatedSize) {
      estimatedSize += module.estimatedSize;
    } else {
      // Estimate from injections
      for (const injection of Object.values(module.injections)) {
        estimatedSize += injection.content.length * 0.6;
      }
    }
  }

  if (estimatedSize > MAX_CONTRACT_SIZE) {
    warnings.push({
      type: 'size',
      message: `Estimated contract size (~${Math.round(estimatedSize / 1024)}KB) exceeds 24KB limit`,
    });
  } else if (estimatedSize > WARN_CONTRACT_SIZE) {
    warnings.push({
      type: 'size',
      message: `Contract size approaching limit (~${Math.round(estimatedSize / 1024)}KB of 24KB)`,
    });
  }

  return warnings;
}

/**
 * Phase 9: Semantic conflict warnings
 */
function validateSemantics(modules: Module[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for conflicting access semantics
  const accessSemantics = modules
    .filter(m => m.semantics?.access)
    .map(m => ({ module: m.name, access: m.semantics!.access }));

  const hasPermissive = accessSemantics.some(s => s.access === 'permissive');
  const hasRestrictive = accessSemantics.some(s => s.access === 'restrictive');

  if (hasPermissive && hasRestrictive) {
    warnings.push({
      type: 'inheritance',
      message: 'Mixing permissive and restrictive access modules may cause unexpected behavior'
    });
  }

  // Check for high gas usage
  const highGasModules = modules.filter(m => m.semantics?.gas === 'high');
  if (highGasModules.length >= 2) {
    warnings.push({
      type: 'gas',
      message: `Multiple high-gas modules detected: ${highGasModules.map(m => m.name).join(', ')}`
    });
  }

  return warnings;
}

/**
 * Get human-readable validation report
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ Validation passed');
  } else {
    lines.push('✗ Validation failed');
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  ✗ [${error.type}] ${error.message}`);
      if (error.suggestion) {
        lines.push(`    → ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  ⚠ [${warning.type}] ${warning.message}`);
    }
  }

  return lines.join('\n');
}
