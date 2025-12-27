/**
 * Solidity Contract Parser
 *
 * Parses Solidity contract code and extracts structured data
 * for the visual contract builder.
 */

export interface ParsedImport {
  id: string;
  statement: string;
  path: string;
  items?: string[]; // For named imports like { FHE, euint64 }
  line: number;
}

export interface ParsedStateVariable {
  id: string;
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'internal';
  isMapping: boolean;
  mappingKeyType?: string;
  mappingValueType?: string;
  line: number;
}

export interface ParsedFHEOperation {
  id: string;
  name: string;        // e.g., "FHE.add", "FHE.asEuint64"
  fullCall: string;    // Full call with arguments
  line: number;
  column: number;
}

export interface ParsedFunction {
  id: string;
  name: string;
  visibility: 'public' | 'private' | 'internal' | 'external';
  stateMutability?: 'pure' | 'view' | 'payable';
  parameters: { name: string; type: string }[];
  returnType?: string;
  modifiers: string[];
  startLine: number;
  endLine: number;
  fheOperations: ParsedFHEOperation[];
  stateAccesses: { name: string; line: number }[]; // State variables used
}

export interface ParsedContract {
  name: string;
  inherits: string[];
  imports: ParsedImport[];
  stateVariables: ParsedStateVariable[];
  functions: ParsedFunction[];
  constructor?: ParsedFunction;
}

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${++idCounter}-${Date.now()}`;

/**
 * Parse import statements
 */
function parseImports(code: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = code.split('\n');

  // Match: import "path"; or import { items } from "path";
  const importRegex = /^import\s+(?:\{([^}]+)\}\s+from\s+)?["']([^"']+)["'];?\s*$/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const match = trimmed.match(importRegex);
    if (match) {
      const items = match[1] ? match[1].split(',').map(s => s.trim()) : undefined;
      imports.push({
        id: generateId('import'),
        statement: trimmed,
        path: match[2],
        items,
        line: index + 1
      });
    }
  });

  return imports;
}

/**
 * Parse state variables
 */
function parseStateVariables(code: string, contractStartLine: number): ParsedStateVariable[] {
  const variables: ParsedStateVariable[] = [];
  const lines = code.split('\n');

  // Find contract body
  let braceCount = 0;
  let inContract = false;
  let inFunction = false;

  // Simple state variable: type visibility name;
  // Mapping: mapping(KeyType => ValueType) visibility name;
  const stateVarRegex = /^\s*(mapping\s*\([^)]+\)|[a-zA-Z_][a-zA-Z0-9_\[\]]*)\s+(public|private|internal)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[;=]/;
  const mappingRegex = /mapping\s*\(\s*([^=]+)\s*=>\s*([^)]+)\s*\)/;

  for (let i = contractStartLine - 1; i < lines.length; i++) {
    const line = lines[i];

    // Track braces
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        if (braceCount === 1) inContract = true;
      }
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) inContract = false;
      }
    }

    // Skip if inside function
    if (line.includes('function ') || line.includes('constructor(')) {
      inFunction = true;
    }
    if (inFunction && line.includes('}') && braceCount <= 1) {
      inFunction = false;
      continue;
    }

    if (!inContract || inFunction || braceCount > 1) continue;

    const match = line.match(stateVarRegex);
    if (match) {
      const typeOrMapping = match[1];
      const visibility = (match[2] || 'internal') as 'public' | 'private' | 'internal';
      const name = match[3];

      const mappingMatch = typeOrMapping.match(mappingRegex);

      if (mappingMatch) {
        variables.push({
          id: generateId('state'),
          name,
          type: typeOrMapping,
          visibility,
          isMapping: true,
          mappingKeyType: mappingMatch[1].trim(),
          mappingValueType: mappingMatch[2].trim(),
          line: i + 1
        });
      } else {
        variables.push({
          id: generateId('state'),
          name,
          type: typeOrMapping,
          visibility,
          isMapping: false,
          line: i + 1
        });
      }
    }
  }

  return variables;
}

/**
 * Parse FHE operations from a code block
 */
function parseFHEOperations(code: string, startLine: number): ParsedFHEOperation[] {
  const operations: ParsedFHEOperation[] = [];
  const lines = code.split('\n');

  // Match FHE.xxx( patterns
  const fheRegex = /FHE\.([a-zA-Z]+)\s*\(/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = fheRegex.exec(line)) !== null) {
      // Extract full call including parentheses
      const startIdx = match.index;
      let parenCount = 0;
      let endIdx = startIdx;
      let started = false;

      for (let i = startIdx; i < line.length; i++) {
        if (line[i] === '(') {
          parenCount++;
          started = true;
        }
        if (line[i] === ')') {
          parenCount--;
        }
        if (started && parenCount === 0) {
          endIdx = i + 1;
          break;
        }
      }

      operations.push({
        id: generateId('fhe'),
        name: `FHE.${match[1]}`,
        fullCall: line.slice(startIdx, endIdx),
        line: startLine + index,
        column: match.index + 1
      });
    }
  });

  return operations;
}

/**
 * Parse functions including constructor (handles multiline function signatures)
 */
function parseFunctions(code: string, stateVars: ParsedStateVariable[]): ParsedFunction[] {
  const functions: ParsedFunction[] = [];
  const lines = code.split('\n');

  // First pass: find function start lines and collect full signature
  const functionStarts: { lineIndex: number; fullSignature: string; endLineIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line starts a function or constructor
    if (/^\s*(function\s+[a-zA-Z_][a-zA-Z0-9_]*|constructor)\s*\(/.test(line)) {
      // Collect lines until we find the opening brace
      let fullSig = line;
      let endIdx = i;
      let parenCount = 0;
      let foundOpenBrace = false;

      for (let j = i; j < lines.length && !foundOpenBrace; j++) {
        const checkLine = lines[j];
        for (const char of checkLine) {
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (char === '{' && parenCount === 0) {
            foundOpenBrace = true;
            break;
          }
        }
        if (j > i) fullSig += ' ' + checkLine.trim();
        endIdx = j;
        if (foundOpenBrace) break;
      }

      functionStarts.push({ lineIndex: i, fullSignature: fullSig, endLineIndex: endIdx });
    }
  }

  // Parse each function
  for (const { lineIndex, fullSignature, endLineIndex } of functionStarts) {
    // Extract function components from full signature
    const funcMatch = fullSignature.match(/^\s*(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|constructor)\s*\(([^)]*)\)/);
    if (!funcMatch) continue;

    const isConstructor = funcMatch[1] === 'constructor';
    const name = isConstructor ? 'constructor' : funcMatch[2];
    const paramsStr = funcMatch[3];

    // Find visibility and modifiers after the closing paren
    const afterParams = fullSignature.substring(fullSignature.indexOf(')') + 1);
    const visibility = afterParams.match(/\b(public|private|internal|external)\b/)?.[1] || (isConstructor ? 'public' : 'internal');
    const stateMutability = afterParams.match(/\b(view|pure|payable)\b/)?.[1];
    const returnsMatch = afterParams.match(/returns\s*\(([^)]+)\)/);
    const returnType = returnsMatch ? returnsMatch[1].trim() : undefined;

    // Parse parameters
    const parameters: { name: string; type: string }[] = [];
    if (paramsStr.trim()) {
      const params = paramsStr.split(',');
      params.forEach(param => {
        const parts = param.trim().split(/\s+/);
        if (parts.length >= 2) {
          // Handle memory/calldata keywords
          const typeIdx = parts.findIndex(p => p === 'memory' || p === 'calldata');
          if (typeIdx > 0) {
            parameters.push({
              type: parts.slice(0, typeIdx).join(' '),
              name: parts[typeIdx + 1] || parts[parts.length - 1]
            });
          } else {
            parameters.push({
              type: parts.slice(0, -1).join(' '),
              name: parts[parts.length - 1]
            });
          }
        }
      });
    }

    // Parse modifiers
    const modifierRegex = /\b(onlyOwner|onlyOracle|whenNotPaused|nonReentrant)\b/g;
    const modifiers: string[] = [];
    let modMatch;
    while ((modMatch = modifierRegex.exec(afterParams)) !== null) {
      modifiers.push(modMatch[1]);
    }

    // Find function end
    let braceCount = 0;
    let bodyStartLine = endLineIndex;
    let functionEndLine = endLineIndex;
    let started = false;

    for (let i = lineIndex; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') { braceCount++; started = true; }
        if (char === '}') braceCount--;
      }
      if (started && braceCount === 0) {
        functionEndLine = i;
        break;
      }
    }

    // Get function body code for FHE operation parsing
    const funcCode = lines.slice(lineIndex, functionEndLine + 1).join('\n');
    const fheOps = parseFHEOperations(funcCode, lineIndex + 1);

    // Find state variable accesses
    const stateAccesses: { name: string; line: number }[] = [];
    stateVars.forEach(sv => {
      const accessRegex = new RegExp(`\\b${sv.name}\\b`, 'g');
      lines.slice(lineIndex, functionEndLine + 1).forEach((fLine, fIdx) => {
        if (accessRegex.test(fLine)) {
          stateAccesses.push({
            name: sv.name,
            line: lineIndex + 1 + fIdx
          });
        }
      });
    });

    functions.push({
      id: generateId('func'),
      name,
      visibility: visibility as 'public' | 'private' | 'internal' | 'external',
      stateMutability: stateMutability as 'pure' | 'view' | 'payable' | undefined,
      parameters,
      returnType,
      modifiers,
      startLine: lineIndex + 1,
      endLine: functionEndLine + 1,
      fheOperations: fheOps,
      stateAccesses
    });
  }

  return functions;
}

/**
 * Main parser function
 */
export function parseContract(code: string): ParsedContract | null {
  // Reset ID counter for each parse
  idCounter = 0;

  // Find contract declaration
  const contractMatch = code.match(/contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(is\s+([^{]+))?\s*\{/);
  if (!contractMatch) {
    return null;
  }

  const contractName = contractMatch[1];
  const inherits = contractMatch[3]
    ? contractMatch[3].split(',').map(s => s.trim())
    : [];

  // Find contract start line
  const lines = code.split('\n');
  let contractStartLine = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`contract ${contractName}`)) {
      contractStartLine = i + 1;
      break;
    }
  }

  const imports = parseImports(code);
  const stateVariables = parseStateVariables(code, contractStartLine);
  const functions = parseFunctions(code, stateVariables);

  // Separate constructor
  const constructorIdx = functions.findIndex(f => f.name === 'constructor');
  const constructor = constructorIdx >= 0 ? functions.splice(constructorIdx, 1)[0] : undefined;

  return {
    name: contractName,
    inherits,
    imports,
    stateVariables,
    functions,
    constructor
  };
}

/**
 * Get line content for highlighting
 */
export function getLineContent(code: string, lineNumber: number): string {
  const lines = code.split('\n');
  return lines[lineNumber - 1] || '';
}
