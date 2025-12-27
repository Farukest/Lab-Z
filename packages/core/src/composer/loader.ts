/**
 * Template and Module Loader
 *
 * Loads base templates and modules from the filesystem.
 * Works in Node.js environment only (CLI usage).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BaseTemplate, Module, TemplateRegistry } from './types';

// Default templates directory (relative to package root)
const DEFAULT_TEMPLATES_DIR = path.resolve(__dirname, '../../../../templates');

/**
 * Load a base template from disk
 */
export function loadBaseTemplate(
  baseName: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): BaseTemplate {
  const basePath = path.join(templatesDir, 'buildable/projects', baseName);

  if (!fs.existsSync(basePath)) {
    throw new Error(`Base template not found: ${baseName}`);
  }

  // Load meta.json
  const metaPath = path.join(basePath, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Base template missing meta.json: ${baseName}`);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  // Load template files
  const files: { [path: string]: string } = {};
  loadFilesRecursively(basePath, basePath, files, ['.tmpl', '.sol.tmpl', '.ts.tmpl']);

  return {
    name: meta.name || baseName,
    version: meta.version || '1.0.0',
    description: meta.description || '',
    files,
    slots: meta.slots || [],
    typeParams: meta.typeParams || {},
    exposes: meta.exposes || { variables: [], functions: [], events: [] },
    inherits: meta.inherits || [],
    imports: meta.imports || []
  };
}

/**
 * Load a module from disk
 */
export function loadModule(
  moduleName: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): Module {
  // Module names are like "acl/transient"
  const modulePath = path.join(templatesDir, 'buildable/modules', moduleName);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Module not found: ${moduleName}`);
  }

  // Load meta.json
  const metaPath = path.join(modulePath, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Module missing meta.json: ${moduleName}`);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  // Process injections - load file content if referenced
  const injections: Module['injections'] = {};

  if (meta.injections) {
    for (const [slotName, injection] of Object.entries(meta.injections as Record<string, any>)) {
      let content = injection.content || '';

      // If content starts with ./ or file:, load from file
      if (content.startsWith('./') || content.startsWith('file:')) {
        // Normalize the path (remove file: prefix if present)
        const relativePath = content.startsWith('file:') ? content.slice(5) : content;
        const filePath = path.join(modulePath, relativePath);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8');
        } else {
          throw new Error(`Module ${moduleName} references missing file: ${relativePath}`);
        }
      }

      injections[slotName] = {
        content,
        mode: injection.mode || 'append',
        order: injection.order ?? 100,
        condition: injection.condition
      };
    }
  }

  // Load additional files
  const additionalFiles: { [path: string]: string } = {};
  const filesDir = path.join(modulePath, 'files');
  if (fs.existsSync(filesDir)) {
    loadFilesRecursively(filesDir, filesDir, additionalFiles);
  }

  // Load test file if exists
  let tests: Module['tests'];
  const testDir = path.join(modulePath, 'test');
  if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.ts'));
    if (testFiles.length > 0) {
      tests = {
        file: fs.readFileSync(path.join(testDir, testFiles[0]), 'utf-8'),
        setup: meta.testSetup
      };
    }
  }

  return {
    name: meta.name || moduleName,
    version: meta.version || '1.0.0',
    description: meta.description || '',
    author: meta.author,
    category: meta.category || 'other',
    tags: meta.tags || [],
    compatibleWith: meta.compatibleWith || [],
    incompatibleWith: meta.incompatibleWith || [],
    requires: meta.requires || [],
    enhances: meta.enhances,
    requiresSlots: meta.requiresSlots || [],
    requiresTypes: meta.requiresTypes,
    requiresVersion: meta.requiresVersion,
    provides: meta.provides || {
      stateVariables: [],
      functions: [],
      modifiers: [],
      events: [],
      errors: []
    },
    exclusive: meta.exclusive ?? false,
    semantics: meta.semantics,
    injections,
    imports: meta.imports || [],
    inherits: meta.inherits,
    additionalFiles: Object.keys(additionalFiles).length > 0 ? additionalFiles : undefined,
    tests,
    estimatedSize: meta.estimatedSize,
    estimatedGas: meta.estimatedGas
  };
}

/**
 * Load all base templates
 */
export function loadAllBases(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): { [name: string]: BaseTemplate } {
  const basesDir = path.join(templatesDir, 'buildable/projects');
  const bases: { [name: string]: BaseTemplate } = {};

  if (!fs.existsSync(basesDir)) {
    return bases;
  }

  const entries = fs.readdirSync(basesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      try {
        bases[entry.name] = loadBaseTemplate(entry.name, templatesDir);
      } catch (err) {
        console.warn(`Failed to load base template ${entry.name}:`, err);
      }
    }
  }

  return bases;
}

/**
 * Load all modules
 */
export function loadAllModules(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): { [name: string]: Module } {
  const modulesDir = path.join(templatesDir, 'buildable/modules');
  const modules: { [name: string]: Module } = {};

  if (!fs.existsSync(modulesDir)) {
    return modules;
  }

  // Modules are organized in category folders
  const categories = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const category of categories) {
    if (category.isDirectory() && !category.name.startsWith('_')) {
      const categoryPath = path.join(modulesDir, category.name);
      const moduleEntries = fs.readdirSync(categoryPath, { withFileTypes: true });

      for (const moduleEntry of moduleEntries) {
        if (moduleEntry.isDirectory() && !moduleEntry.name.startsWith('_')) {
          const moduleName = `${category.name}/${moduleEntry.name}`;
          try {
            modules[moduleName] = loadModule(moduleName, templatesDir);
          } catch (err) {
            console.warn(`Failed to load module ${moduleName}:`, err);
          }
        }
      }
    }
  }

  return modules;
}

/**
 * Load complete registry
 */
export function loadRegistry(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): TemplateRegistry {
  return {
    bases: loadAllBases(templatesDir),
    modules: loadAllModules(templatesDir)
  };
}

/**
 * Get list of available base names
 */
export function getAvailableBases(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): string[] {
  const basesDir = path.join(templatesDir, 'buildable/projects');

  if (!fs.existsSync(basesDir)) {
    return [];
  }

  return fs.readdirSync(basesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name);
}

/**
 * Get list of available module names
 */
export function getAvailableModules(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): string[] {
  const modulesDir = path.join(templatesDir, 'buildable/modules');

  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const modules: string[] = [];
  const categories = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const category of categories) {
    if (category.isDirectory() && !category.name.startsWith('_')) {
      const categoryPath = path.join(modulesDir, category.name);
      const moduleEntries = fs.readdirSync(categoryPath, { withFileTypes: true });

      for (const moduleEntry of moduleEntries) {
        if (moduleEntry.isDirectory() && !moduleEntry.name.startsWith('_')) {
          modules.push(`${category.name}/${moduleEntry.name}`);
        }
      }
    }
  }

  return modules;
}

/**
 * Helper: Load files recursively
 */
function loadFilesRecursively(
  dir: string,
  baseDir: string,
  result: { [path: string]: string },
  extensions?: string[]
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      loadFilesRecursively(fullPath, baseDir, result, extensions);
    } else if (entry.isFile()) {
      // Check extension filter
      if (extensions) {
        const hasValidExt = extensions.some(ext => entry.name.endsWith(ext));
        if (!hasValidExt) continue;
      }

      result[relativePath] = fs.readFileSync(fullPath, 'utf-8');
    }
  }
}

/**
 * Check if a base template exists
 */
export function baseExists(
  baseName: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): boolean {
  const basePath = path.join(templatesDir, 'buildable/projects', baseName);
  return fs.existsSync(basePath) && fs.existsSync(path.join(basePath, 'meta.json'));
}

/**
 * Check if a module exists
 */
export function moduleExists(
  moduleName: string,
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): boolean {
  const modulePath = path.join(templatesDir, 'buildable/modules', moduleName);
  return fs.existsSync(modulePath) && fs.existsSync(path.join(modulePath, 'meta.json'));
}
