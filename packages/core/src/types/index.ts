/**
 * Core types for Lab-Z
 * All template metadata, blocks, and configuration types
 */

// ============================================
// Category & Difficulty Types
// ============================================

export type Category =
  | 'basics'
  | 'encryption'
  | 'decryption'
  | 'acl'
  | 'handles'
  | 'antipatterns'
  | 'security'
  | 'input-proofs'
  | 'openzeppelin'
  | 'advanced';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type BlockType =
  | 'import'
  | 'state'
  | 'constructor'
  | 'function'
  | 'modifier'
  | 'event'
  | 'error'
  | 'comment';

// ============================================
// Code Block Types
// ============================================

export interface CodeBlock {
  /** Unique identifier for this block */
  id: string;
  /** Type of code block */
  type: BlockType;
  /** Line range in the source file [start, end] (1-indexed) */
  lines: [number, number];
  /** Human-readable explanation of this block */
  explanation: string;
  /** Search terms for this block (multiple languages supported) */
  searchTerms: string[];
  /** Related block IDs */
  relatedBlocks?: string[];
  /** Tags for filtering */
  tags?: string[];
}

// ============================================
// Template Types
// ============================================

export interface TemplateFile {
  /** Relative path in generated project */
  path: string;
  /** Source file path relative to template directory */
  source: string;
}

export interface TemplateMetadata {
  /** Unique identifier (e.g., 'counter', 'blind-auction') */
  id: string;
  /** Display name */
  name: string;
  /** Category for organization */
  category: Category;
  /** Difficulty level */
  difficulty: Difficulty;
  /** Tags for filtering and search */
  tags: string[];
  /** Short description */
  description: string;
  /** Detailed explanation (supports markdown) */
  longDescription?: string;
  /** Code blocks with explanations */
  blocks: CodeBlock[];
  /** Files to include in generated project */
  files: TemplateFile[];
  /** Related template IDs */
  relatedTemplates?: string[];
  /** Prerequisites (template IDs that should be learned first) */
  prerequisites?: string[];
  /** Suggested next templates to learn */
  nextSteps?: string[];
  /** Author information */
  author?: string;
  /** Version */
  version?: string;
}

// ============================================
// Template Instance (loaded template)
// ============================================

export interface Template extends TemplateMetadata {
  /** Absolute path to template directory */
  path: string;
  /** Contract source code */
  contractCode: string;
  /** Test source code */
  testCode: string;
  /** README content (if exists) */
  readme?: string;
}

// ============================================
// Search Types
// ============================================

export interface SearchOptions {
  /** Filter by category */
  category?: Category;
  /** Filter by difficulty */
  difficulty?: Difficulty;
  /** Filter by tags */
  tags?: string[];
  /** Maximum results to return */
  limit?: number;
  /** Include block-level matches */
  includeBlocks?: boolean;
}

export interface SearchResult {
  /** Matched template */
  template: Template;
  /** Relevance score (0-1) */
  score: number;
  /** Matched blocks (if includeBlocks is true) */
  matchedBlocks?: CodeBlock[];
  /** Highlighted matches */
  highlights?: {
    field: string;
    value: string;
  }[];
}

// ============================================
// Generator Types
// ============================================

export interface GeneratorOptions {
  /** Template ID to generate */
  templateId: string;
  /** Output directory */
  outputDir: string;
  /** Project name (defaults to template name) */
  projectName?: string;
  /** Custom variables for template interpolation */
  variables?: Record<string, string>;
  /** Skip npm install */
  skipInstall?: boolean;
  /** Skip git init */
  skipGit?: boolean;
}

export interface GeneratorResult {
  /** Whether generation was successful */
  success: boolean;
  /** Output directory path */
  outputPath: string;
  /** Generated files */
  files: string[];
  /** Error message if failed */
  error?: string;
}

// ============================================
// Registry Types
// ============================================

export interface RegistryStats {
  /** Total number of templates */
  totalTemplates: number;
  /** Templates by category */
  byCategory: Record<Category, number>;
  /** Templates by difficulty */
  byDifficulty: Record<Difficulty, number>;
  /** All available tags */
  allTags: string[];
}

// ============================================
// Configuration Types
// ============================================

export interface HubConfig {
  /** Path to templates directory */
  templatesDir: string;
  /** Path to base template */
  baseTemplatePath: string;
  /** Default output directory */
  defaultOutputDir?: string;
}

// ============================================
// Category Metadata
// ============================================

export interface CategoryInfo {
  id: Category;
  name: string;
  description: string;
  icon: string;
  order: number;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'basics',
    name: 'Basics',
    description: 'Fundamental FHEVM concepts and operations',
    icon: '📦',
    order: 1,
  },
  {
    id: 'encryption',
    name: 'Encryption',
    description: 'Encrypting values client-side and on-chain',
    icon: '🔐',
    order: 2,
  },
  {
    id: 'decryption',
    name: 'Decryption',
    description: 'User decryption and public decryption patterns',
    icon: '🔓',
    order: 3,
  },
  {
    id: 'acl',
    name: 'Access Control',
    description: 'FHE.allow, FHE.allowTransient, and permission management',
    icon: '🛡️',
    order: 4,
  },
  {
    id: 'handles',
    name: 'Handles',
    description: 'Understanding FHE handles - 256-bit references to encrypted data',
    icon: '🔗',
    order: 5,
  },
  {
    id: 'input-proofs',
    name: 'Input Proofs',
    description: 'Understanding and using input proofs for secure encrypted inputs',
    icon: '🔏',
    order: 6,
  },
  {
    id: 'antipatterns',
    name: 'Anti-patterns',
    description: 'Common mistakes and how to avoid them',
    icon: '⚠️',
    order: 7,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security patterns, input validation, and best practices',
    icon: '🔒',
    order: 8,
  },
  {
    id: 'openzeppelin',
    name: 'OpenZeppelin',
    description: 'ERC7984 confidential tokens and related patterns',
    icon: '🏛️',
    order: 9,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Complex patterns like blind auctions and multi-party computation',
    icon: '🚀',
    order: 10,
  },
];

export const DIFFICULTY_INFO: Record<Difficulty, { name: string; color: string; order: number }> = {
  beginner: { name: 'Beginner', color: '#22c55e', order: 1 },
  intermediate: { name: 'Intermediate', color: '#eab308', order: 2 },
  advanced: { name: 'Advanced', color: '#ef4444', order: 3 },
};
