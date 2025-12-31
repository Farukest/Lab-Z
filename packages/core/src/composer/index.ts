/**
 * Composable Template System
 *
 * A modular system for creating customized FHE smart contracts
 * by merging base templates with feature modules.
 *
 * @example
 * ```typescript
 * import { createProject } from '@lab-z/core/composer';
 *
 * // Create a counter with transient ACL and pausable
 * const result = await createProject({
 *   base: 'counter',
 *   modules: ['acl/transient', 'security/pausable'],
 *   projectName: 'MyCounter',
 *   outputDir: './my-counter'
 * });
 * ```
 */

// Re-export types
export * from './types';

// Re-export parser utilities
export {
  parseTemplate,
  applyInjections,
  applyTypeParams,
  getSlotNames,
  hasSlot,
  validateSlots
} from './parser';

// Re-export loader utilities
export {
  loadBaseTemplate,
  loadModule,
  loadAllBases,
  loadAllModules,
  loadRegistry,
  getAvailableBases,
  getAvailableModules,
  baseExists,
  moduleExists
} from './loader';

// Re-export validator
export {
  validate,
  formatValidationResult
} from './validator';

// Re-export merger
export {
  merge,
  generatePreview
} from './merger';

// High-level API
import * as fs from 'fs';
import * as path from 'path';
import type { CreateOptions, MergeResult, Module, BaseTemplate } from './types';
import { loadBaseTemplate, loadModule, loadAllModules } from './loader';
import { merge, generatePreview } from './merger';
import { validate, formatValidationResult } from './validator';

/**
 * Create a new project from base template and modules
 */
export async function createProject(options: CreateOptions): Promise<MergeResult> {
  const templatesDir = path.resolve(__dirname, '../../../../templates');

  // Load base template
  const base = loadBaseTemplate(options.base, templatesDir);

  // Load modules
  const modules: Module[] = [];
  for (const moduleName of options.with || []) {
    const module = loadModule(moduleName, templatesDir);
    modules.push(module);
  }

  // Merge
  const result = merge(base, modules, {
    projectName: options.name,
    typeParams: options.type ? { MAIN_TYPE: options.type } : undefined
  });

  // If dry run, just return the result
  if (options.dryRun) {
    return result;
  }

  // Write files
  if (result.success && options.output) {
    await writeProject(options.output, result.files, base, modules, options.name);
  }

  return result;
}

/**
 * Check compatibility without creating project
 */
export function checkCompatibility(
  baseName: string,
  moduleNames: string[]
): { valid: boolean; report: string } {
  const templatesDir = path.resolve(__dirname, '../../../../templates');

  try {
    const base = loadBaseTemplate(baseName, templatesDir);
    const modules = moduleNames.map(name => loadModule(name, templatesDir));
    const result = validate(base, modules);

    return {
      valid: result.valid,
      report: formatValidationResult(result)
    };
  } catch (err) {
    return {
      valid: false,
      report: `Error: ${(err as Error).message}`
    };
  }
}

/**
 * Get preview of what will be generated
 */
export function previewProject(
  baseName: string,
  moduleNames: string[],
  projectName: string
): string {
  const templatesDir = path.resolve(__dirname, '../../../../templates');

  const base = loadBaseTemplate(baseName, templatesDir);
  const modules = moduleNames.map(name => loadModule(name, templatesDir));

  return generatePreview(base, modules, { projectName });
}

/**
 * List available modules for a base
 */
export function listModulesForBase(baseName: string): Module[] {
  const templatesDir = path.resolve(__dirname, '../../../../templates');

  try {
    // Verify base exists
    loadBaseTemplate(baseName, templatesDir);
    const allModules = loadAllModules(templatesDir);

    // Filter modules compatible with this base
    return (Object.values(allModules) as Module[]).filter((module) => {
      if (module.compatibleWith.length === 0) return true;
      return module.compatibleWith.includes(baseName);
    });
  } catch {
    return [];
  }
}

/**
 * Write project files to disk
 */
async function writeProject(
  outputDir: string,
  files: { [path: string]: string },
  base: BaseTemplate,
  modules: Module[],
  projectName: string
): Promise<void> {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy base hardhat template
  // Try multiple locations for the base template
  const possibleBasePaths = [
    path.resolve(__dirname, '../../../../base-template'),  // From packages/core/dist/composer
    path.resolve(__dirname, '../../../base-template'),     // Alternative
    path.resolve(process.cwd(), 'base-template'),          // From cwd
  ];

  for (const baseHardhatDir of possibleBasePaths) {
    if (fs.existsSync(baseHardhatDir)) {
      copyDirSync(baseHardhatDir, outputDir);
      break;
    }
  }

  // Write generated files
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // Generate README
  const readme = generateReadme(projectName, base, modules);
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf-8');

  // Update package.json with project name
  const pkgPath = path.join(outputDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.name = projectName.toLowerCase();
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
  }
}

/**
 * Copy directory recursively
 */
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Generate README for the project
 */
function generateReadme(
  projectName: string,
  base: BaseTemplate,
  modules: Module[]
): string {
  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push('');
  lines.push(`Generated with [Lab-Z](https://github.com/Lab-Z)`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(`Base template: **${base.name}** - ${base.description}`);
  lines.push('');

  if (modules.length > 0) {
    lines.push('### Modules Included');
    lines.push('');
    for (const module of modules) {
      lines.push(`- **${module.name}**: ${module.description}`);
    }
    lines.push('');
  }

  lines.push('## Getting Started');
  lines.push('');
  lines.push('```bash');
  lines.push('# Install dependencies');
  lines.push('npm install');
  lines.push('');
  lines.push('# Compile contracts');
  lines.push('npx hardhat compile');
  lines.push('');
  lines.push('# Run tests');
  lines.push('npx hardhat test');
  lines.push('');
  lines.push('# Deploy to Zama devnet');
  lines.push('npx hardhat run deploy/deploy.ts --network zama');
  lines.push('```');
  lines.push('');
  lines.push('## Project Structure');
  lines.push('');
  lines.push('```');
  lines.push(`${projectName.toLowerCase()}/`);
  lines.push('├── contracts/');
  lines.push(`│   └── ${projectName}.sol    # Main contract`);
  lines.push('├── test/');
  lines.push(`│   └── ${projectName}.test.ts # Tests`);
  lines.push('├── deploy/');
  lines.push('│   └── deploy.ts             # Deploy script');
  lines.push('├── hardhat.config.ts');
  lines.push('└── package.json');
  lines.push('```');
  lines.push('');
  lines.push('## Features');
  lines.push('');

  // List features from modules
  for (const module of modules) {
    if (module.provides.functions.length > 0) {
      lines.push(`### ${module.name}`);
      lines.push('');
      lines.push('Functions:');
      for (const fn of module.provides.functions) {
        lines.push(`- \`${fn}()\``);
      }
      lines.push('');
    }
  }

  lines.push('## License');
  lines.push('');
  lines.push('BSD-3-Clause-Clear');

  return lines.join('\n');
}
