/**
 * Merge Engine
 *
 * Combines base templates with modules to generate final output.
 */

import type {
  BaseTemplate,
  Module,
  MergeResult,
  MergeOptions,
  SlotInjection
} from './types';
import {
  parseTemplate,
  applyInjections,
  applyTypeParams,
  cleanupEmptyLines
} from './parser';
import { validate } from './validator';

/**
 * Convert project name to valid Solidity contract name
 * - Removes hyphens/underscores and converts to PascalCase
 * - Ensures first character is uppercase
 */
function toContractName(projectName: string): string {
  return projectName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Merge a base template with modules
 */
export function merge(
  base: BaseTemplate,
  modules: Module[],
  options: {
    projectName: string;
    typeParams?: { [key: string]: string };
  }
): MergeResult {
  // Run validation first
  const validation = validate(base, modules, { typeParams: options.typeParams });

  if (!validation.valid) {
    return {
      success: false,
      files: {},
      validation,
      stats: {
        baseTemplate: base.name,
        modulesApplied: [],
        slotsUsed: []
      }
    };
  }

  // Sort modules by dependency order
  const sortedModules = topologicalSort(modules);

  // Collect all injections
  const allInjections = collectInjections(sortedModules);

  // Collect all additional imports
  const additionalImports = collectImports(sortedModules);

  // Collect all inheritance additions
  const additionalInherits = collectInheritance(sortedModules);

  // Build type parameters with defaults
  const effectiveTypeParams: { [key: string]: string } = {};
  for (const [param, def] of Object.entries(base.typeParams)) {
    effectiveTypeParams[param] = options.typeParams?.[param] || def.default;
  }

  // Process each template file
  const outputFiles: { [path: string]: string } = {};
  const slotsUsed = new Set<string>();

  for (const [templatePath, templateContent] of Object.entries(base.files)) {
    // Get output path (remove .tmpl extension)
    const outputPath = templatePath.replace(/\.tmpl$/, '');

    // Process the template
    let content = templateContent;

    // Apply project name and contract name
    const contractName = toContractName(options.projectName);
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, options.projectName);
    content = content.replace(/\{\{CONTRACT_NAME\}\}/g, contractName);

    // Handle special slots (imports and inherits)
    content = processSpecialSlots(content, {
      imports: [...base.imports, ...additionalImports],
      inherits: [...base.inherits, ...additionalInherits],
      projectName: options.projectName
    });

    // Apply regular slot injections
    const parsed = parseTemplate(content);
    for (const slot of parsed.slots) {
      if (allInjections.some(inj => inj.slotName === slot.name)) {
        slotsUsed.add(slot.name);
      }
    }

    content = applyInjections(content, allInjections);

    // Apply type parameters (after injections so module content gets type params too)
    content = applyTypeParams(content, effectiveTypeParams);

    // Clean up
    content = cleanupEmptyLines(content);
    content = cleanupTrailingWhitespace(content);

    outputFiles[outputPath] = content;
  }

  // Add module additional files
  for (const module of sortedModules) {
    if (module.additionalFiles) {
      for (const [filePath, fileContent] of Object.entries(module.additionalFiles)) {
        // Apply same transformations
        const contractName = toContractName(options.projectName);
        let content = applyTypeParams(fileContent, effectiveTypeParams);
        content = content.replace(/\{\{PROJECT_NAME\}\}/g, options.projectName);
        content = content.replace(/\{\{CONTRACT_NAME\}\}/g, contractName);
        outputFiles[filePath] = content;
      }
    }
  }

  // Add module tests as separate files
  for (const module of sortedModules) {
    if (module.tests) {
      const contractName = toContractName(options.projectName);
      const testFileName = `test/${options.projectName}.${module.name.replace('/', '.')}.test.ts`;
      let content = module.tests.file;
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, options.projectName);
      content = content.replace(/\{\{CONTRACT_NAME\}\}/g, contractName);
      outputFiles[testFileName] = content;
    }
  }

  return {
    success: true,
    files: outputFiles,
    validation,
    stats: {
      baseTemplate: base.name,
      modulesApplied: sortedModules.map(m => m.name),
      slotsUsed: Array.from(slotsUsed)
    }
  };
}

/**
 * Topological sort modules by dependencies
 */
function topologicalSort(modules: Module[]): Module[] {
  const moduleMap = new Map(modules.map(m => [m.name, m]));
  const sorted: Module[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(moduleName: string): void {
    if (visited.has(moduleName)) return;
    if (temp.has(moduleName)) {
      throw new Error(`Circular dependency detected involving ${moduleName}`);
    }

    const module = moduleMap.get(moduleName);
    if (!module) return;

    temp.add(moduleName);

    for (const dep of module.requires) {
      visit(dep);
    }

    temp.delete(moduleName);
    visited.add(moduleName);
    sorted.push(module);
  }

  for (const module of modules) {
    visit(module.name);
  }

  return sorted;
}

/**
 * Collect all injections from modules
 */
function collectInjections(modules: Module[]): SlotInjection[] {
  const injections: SlotInjection[] = [];

  for (const module of modules) {
    for (const [slotName, injection] of Object.entries(module.injections)) {
      injections.push({
        slotName,
        content: injection.content,
        mode: injection.mode,
        order: injection.order,
        condition: injection.condition,
        sourceModule: module.name
      });
    }
  }

  // Sort by order within each slot
  injections.sort((a, b) => a.order - b.order);

  return injections;
}

/**
 * Collect all imports from modules
 */
function collectImports(modules: Module[]): string[] {
  const imports: string[] = [];

  for (const module of modules) {
    // Check module.imports directly
    if (module.imports) {
      imports.push(...module.imports);
    }
    // Also check module.inherits?.imports for backwards compatibility
    if (module.inherits?.imports) {
      imports.push(...module.inherits.imports);
    }
  }

  // Deduplicate
  return [...new Set(imports)];
}

/**
 * Collect all inheritance additions from modules
 */
function collectInheritance(modules: Module[]): string[] {
  const inherits: string[] = [];

  for (const module of modules) {
    if (module.inherits?.contracts) {
      inherits.push(...module.inherits.contracts);
    }
  }

  // Deduplicate
  return [...new Set(inherits)];
}

/**
 * Process special slots like {{IMPORTS}} and {{INHERITS}}
 */
function processSpecialSlots(
  content: string,
  data: {
    imports: string[];
    inherits: string[];
    projectName: string;
  }
): string {
  let result = content;

  // Handle {{IMPORTS}}
  if (data.imports.length > 0) {
    const importsStr = data.imports.join('\n');
    result = result.replace(/\{\{IMPORTS\}\}/g, importsStr);
  } else {
    result = result.replace(/\{\{IMPORTS\}\}/g, '');
  }

  // Handle {{INHERITS}}
  if (data.inherits.length > 0) {
    const inheritsStr = data.inherits.join(', ');
    result = result.replace(/\{\{INHERITS\}\}/g, inheritsStr);
  } else {
    result = result.replace(/\{\{INHERITS\}\}/g, '');
  }

  return result;
}

/**
 * Clean up trailing whitespace
 */
function cleanupTrailingWhitespace(content: string): string {
  return content
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}

/**
 * Generate a diff-like preview of what will be added
 */
export function generatePreview(
  base: BaseTemplate,
  modules: Module[],
  options: { projectName: string; typeParams?: { [key: string]: string } }
): string {
  const lines: string[] = [];

  lines.push(`╭─────────────────────────────────────────────────────────────╮`);
  lines.push(`│ Preview: ${base.name} + ${modules.map(m => m.name).join(', ')}`);
  lines.push(`├─────────────────────────────────────────────────────────────┤`);

  // Show imports being added
  const additionalImports = collectImports(modules);
  if (additionalImports.length > 0) {
    lines.push(`│ Imports added:`);
    for (const imp of additionalImports) {
      lines.push(`│ + ${imp}`);
    }
    lines.push(`│`);
  }

  // Show inheritance additions
  const additionalInherits = collectInheritance(modules);
  if (additionalInherits.length > 0) {
    lines.push(`│ Inheritance added:`);
    lines.push(`│ + is ${additionalInherits.join(', ')}`);
    lines.push(`│`);
  }

  // Show injections by slot
  const sortedModules = topologicalSort(modules);
  const injectionsBySlot = new Map<string, SlotInjection[]>();

  for (const module of sortedModules) {
    for (const [slotName, injection] of Object.entries(module.injections)) {
      const existing = injectionsBySlot.get(slotName) || [];
      existing.push({
        slotName,
        content: injection.content,
        mode: injection.mode,
        order: injection.order,
        sourceModule: module.name
      });
      injectionsBySlot.set(slotName, existing);
    }
  }

  for (const [slotName, injections] of injectionsBySlot) {
    lines.push(`│ {{${slotName}}}:`);
    for (const inj of injections) {
      const contentLines = inj.content.trim().split('\n');
      for (const contentLine of contentLines.slice(0, 3)) {
        lines.push(`│ + ${contentLine}`);
      }
      if (contentLines.length > 3) {
        lines.push(`│ + ... (${contentLines.length - 3} more lines)`);
      }
      lines.push(`│   └─ from ${inj.sourceModule}`);
    }
    lines.push(`│`);
  }

  // Show new functions
  const allFunctions: string[] = [];
  for (const module of modules) {
    allFunctions.push(...module.provides.functions);
  }
  if (allFunctions.length > 0) {
    lines.push(`│ New functions:`);
    for (const fn of allFunctions) {
      lines.push(`│ + ${fn}()`);
    }
    lines.push(`│`);
  }

  // Show new state variables
  const allStateVars: string[] = [];
  for (const module of modules) {
    allStateVars.push(...module.provides.stateVariables);
  }
  if (allStateVars.length > 0) {
    lines.push(`│ New state variables:`);
    for (const v of allStateVars) {
      lines.push(`│ + ${v}`);
    }
    lines.push(`│`);
  }

  lines.push(`╰─────────────────────────────────────────────────────────────╯`);

  return lines.join('\n');
}
