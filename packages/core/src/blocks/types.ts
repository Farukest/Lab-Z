/**
 * Block System Types
 *
 * Defines the structure for drag-and-drop contract building
 */

// Zone types in a Solidity contract
export type ZoneType =
  | 'imports'           // Import statements
  | 'state'             // State variables inside contract
  | 'constructor'       // Constructor body
  | 'function-params'   // Function parameters
  | 'function-body'     // Inside a function
  | 'modifier-body';    // Inside a modifier

// Block categories
export type BlockCategory =
  | 'import'
  | 'state'
  | 'function'
  | 'input-conversion'
  | 'arithmetic'
  | 'comparison'
  | 'bitwise'
  | 'conditional'
  | 'acl'
  | 'decrypt'
  | 'modifier'
  | 'require';

// Encrypted types in FHEVM
export type EncryptedType =
  | 'ebool'
  | 'euint8'
  | 'euint16'
  | 'euint32'
  | 'euint64'
  | 'euint128'
  | 'euint256'
  | 'eaddress';

// External input types
export type ExternalType =
  | 'externalEbool'
  | 'externalEuint8'
  | 'externalEuint16'
  | 'externalEuint32'
  | 'externalEuint64'
  | 'externalEuint128'
  | 'externalEuint256'
  | 'externalEaddress';

// Block parameter definition
export interface BlockParam {
  id: string;
  label: string;
  type: 'string' | 'variable' | 'address' | 'type-select';
  default?: string;
  options?: string[];         // For type-select
  variableType?: string;      // Filter variables by type (e.g., 'euint*')
  required?: boolean;
}

// A code block definition
export interface Block {
  id: string;
  name: string;
  description: string;
  category: BlockCategory;

  // Zone rules
  canDropIn: ZoneType[];

  // Dependency rules
  requires?: string[];          // Block IDs that must exist
  incompatibleWith?: string[];  // Block IDs that cannot coexist

  // Order rules
  mustComeAfter?: string[];     // Must come after these (supports wildcards like 'op-*')
  mustComeBefore?: string[];    // Must come before these

  // Type rules
  inputTypes?: string[];        // Required input types (e.g., 'euint32+euint32')
  outputType?: string;          // What type this block produces

  // Auto-suggestions
  autoAdds?: string[];          // Blocks to suggest adding after this

  // Template
  template: string;             // Code template with {{placeholders}}
  params?: BlockParam[];        // Parameters for the template

  // Search
  tags: string[];

  // Visual
  icon?: string;
  color?: string;
}

// Project state - what the user has built
export interface ProjectBlock {
  id: string;                   // Unique instance ID
  blockId: string;              // Reference to Block.id
  config: Record<string, string>; // Parameter values
  order: number;
  zoneType: ZoneType;
  parentId?: string;            // For nested blocks (e.g., inside a function)
}

export interface ProjectFunction {
  id: string;
  name: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  stateMutability?: 'view' | 'pure' | 'payable';
  params: Array<{ name: string; type: string }>;
  returns?: Array<{ name?: string; type: string }>;
  body: ProjectBlock[];
}

export interface ProjectState {
  name: string;
  version: string;
  inherits: string[];           // Contract inheritance (e.g., ['SepoliaConfig'])
  imports: ProjectBlock[];
  stateVariables: ProjectBlock[];
  constructorBody?: ProjectBlock[];
  functions: ProjectFunction[];
  modifiers: ProjectBlock[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  canDrop: boolean;
  errors: string[];
  warnings: string[];
  autoAdd?: string[];           // Blocks that will be auto-added
  insertPosition?: number;      // Suggested insert position
}

// Drop zone visual state
export interface DropZoneState {
  zoneId: string;
  zoneType: ZoneType;
  isHighlighted: boolean;
  highlightColor: 'green' | 'red' | 'yellow' | 'none';
  message?: string;
  canAccept: boolean;
}
