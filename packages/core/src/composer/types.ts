/**
 * Composable Template System - Core Types
 *
 * This system allows merging base templates with feature modules
 * to create customized FHE smart contracts.
 */

// ============================================================================
// SLOT TYPES
// ============================================================================

export type SlotMode = 'append' | 'prepend' | 'replace' | 'once';

export interface SlotDefinition {
  name: string;
  description: string;
  mode: SlotMode;
  required: boolean;
  defaultContent?: string;
}

export interface SlotInjection {
  slotName: string;
  content: string;
  mode: SlotMode;
  order: number;  // Lower = earlier
  condition?: string;
  sourceModule: string;
}

// ============================================================================
// BASE TEMPLATE TYPES
// ============================================================================

export interface BaseTemplate {
  // Identity
  name: string;
  version: string;
  description: string;

  // Template files with slots
  files: {
    [path: string]: string;  // Path -> content with {{SLOT}} markers
  };

  // Available slots in this template
  slots: SlotDefinition[];

  // Type parameters (e.g., main encrypted type)
  typeParams: {
    [paramName: string]: {
      type: string;
      options: string[];
      default: string;
      description: string;
    };
  };

  // What this base exposes for modules to reference
  exposes: {
    variables: string[];
    functions: string[];
    events: string[];
  };

  // Default inheritance
  inherits: string[];

  // Default imports
  imports: string[];
}

// ============================================================================
// MODULE TYPES
// ============================================================================

export type ModuleCategory =
  | 'acl'        // Access control
  | 'admin'      // Administration
  | 'security'   // Security features
  | 'events'     // Event emission
  | 'upgrade'    // Upgradeability
  | 'fhe-type'   // FHE type selection
  | 'fhe-ops'    // FHE operations
  | 'integration'; // External integrations

export interface ModuleSemantics {
  access?: 'permissive' | 'restrictive' | 'conditional';
  mutability?: 'adds-state' | 'stateless';
  gas?: 'low' | 'medium' | 'high';
}

export interface ModuleProvides {
  stateVariables: string[];
  functions: string[];
  modifiers: string[];
  events: string[];
  errors: string[];
}

export interface ModuleInheritance {
  contracts: string[];
  imports: string[];
}

export interface ModuleInjection {
  content: string;       // Inline content or file path (starting with ./)
  mode: SlotMode;
  order: number;
  condition?: string;
}

export interface ModuleTest {
  file: string;
  setup?: string;
}

export interface Module {
  // Identity
  name: string;
  version: string;
  description: string;
  author?: string;

  // Categorization
  category: ModuleCategory;
  tags: string[];

  // Compatibility
  compatibleWith: string[];      // Base template names
  incompatibleWith: string[];    // Module names that conflict

  // Dependencies
  requires: string[];            // Required modules
  enhances?: string[];           // Works better with (soft dependency)

  // Requirements
  requiresSlots: string[];
  requiresTypes?: string[];
  requiresVersion?: string;

  // What this module provides
  provides: ModuleProvides;

  // Exclusivity within category
  exclusive: boolean;

  // Semantic tags for conflict detection
  semantics?: ModuleSemantics;

  // Injections by slot name
  injections: {
    [slotName: string]: ModuleInjection;
  };

  // Additional imports to add
  imports?: string[];

  // Inheritance additions
  inherits?: ModuleInheritance;

  // Additional files to add
  additionalFiles?: {
    [path: string]: string;
  };

  // Test integration
  tests?: ModuleTest;

  // Estimates
  estimatedSize?: number;
  estimatedGas?: {
    deployment: number;
    perCall: number;
  };
}

// ============================================================================
// MERGE TYPES
// ============================================================================

export interface MergeOptions {
  base: string;
  modules: string[];
  projectName: string;
  typeParams?: { [key: string]: string };
  outputDir?: string;
  dryRun?: boolean;
}

export interface ValidationError {
  type: 'compatibility' | 'dependency' | 'slot' | 'type' | 'collision' | 'exclusivity' | 'size';
  message: string;
  module?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'gas' | 'size' | 'inheritance' | 'deprecation';
  message: string;
  module?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface MergeResult {
  success: boolean;
  files: { [path: string]: string };
  validation: ValidationResult;
  stats: {
    baseTemplate: string;
    modulesApplied: string[];
    slotsUsed: string[];
    estimatedSize?: number;
  };
}

// ============================================================================
// REGISTRY TYPES
// ============================================================================

export interface TemplateRegistry {
  bases: { [name: string]: BaseTemplate };
  modules: { [name: string]: Module };
}

// ============================================================================
// CLI TYPES
// ============================================================================

export interface CreateOptions {
  base: string;
  with: string[];
  name: string;
  type?: string;
  output?: string;
  dryRun?: boolean;
  interactive?: boolean;
  force?: boolean;
}

export interface ModulesListOptions {
  for?: string;        // Filter by base compatibility
  category?: string;   // Filter by category
  verbose?: boolean;
}

export interface CheckOptions {
  base: string;
  with: string[];
  verbose?: boolean;
}
