/**
 * Code Parser Utility
 *
 * Automatically finds function locations, line numbers, and code sections
 * from Solidity and TypeScript code. Eliminates need for manual line numbers.
 */

export interface FunctionLocation {
  name: string;
  startLine: number;
  endLine: number;
  signature?: string;
}

export interface CodeSection {
  id: string;
  startLine: number;
  endLine: number;
  title?: string;
}

/**
 * Parse Solidity code and find all function locations
 */
export function parseSolidityFunctions(code: string): Map<string, FunctionLocation> {
  const lines = code.split('\n');
  const functions = new Map<string, FunctionLocation>();

  let currentFunction: { name: string; startLine: number; braceCount: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-indexed

    // Match function declaration
    const funcMatch = line.match(/function\s+(\w+)\s*\(/);
    if (funcMatch && !currentFunction) {
      currentFunction = {
        name: funcMatch[1],
        startLine: lineNum,
        braceCount: 0
      };
    }

    if (currentFunction) {
      // Count braces
      currentFunction.braceCount += (line.match(/{/g) || []).length;
      currentFunction.braceCount -= (line.match(/}/g) || []).length;

      // Function ends when braces balance
      if (currentFunction.braceCount === 0 && line.includes('}')) {
        functions.set(currentFunction.name, {
          name: currentFunction.name,
          startLine: currentFunction.startLine,
          endLine: lineNum
        });
        currentFunction = null;
      }
    }
  }

  return functions;
}

/**
 * Parse code sections marked with comments like:
 * // ============ Stage 1: Birth ============
 */
export function parseCodeSections(code: string): Map<string, CodeSection> {
  const lines = code.split('\n');
  const sections = new Map<string, CodeSection>();

  let currentSection: { id: string; title: string; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match section header: // ============ Stage X: Name ============
    const sectionMatch = line.match(/\/\/\s*=+\s*(Stage\s*\d+[^=]*?)\s*=+/i);
    if (sectionMatch) {
      // Close previous section
      if (currentSection) {
        sections.set(currentSection.id, {
          id: currentSection.id,
          title: currentSection.title,
          startLine: currentSection.startLine,
          endLine: lineNum - 1
        });
      }

      // Start new section
      const title = sectionMatch[1].trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      currentSection = { id, title, startLine: lineNum };
    }
  }

  // Close last section
  if (currentSection) {
    sections.set(currentSection.id, {
      id: currentSection.id,
      title: currentSection.title,
      startLine: currentSection.startLine,
      endLine: lines.length
    });
  }

  return sections;
}

/**
 * Check if a line is a comment (single-line or multi-line comment content)
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('/**')
  );
}

/**
 * Get the code part of a line (before any inline comment)
 */
function getCodePart(line: string): string {
  const commentIndex = line.indexOf('//');
  return commentIndex > -1 ? line.substring(0, commentIndex) : line;
}

/**
 * Find a specific line containing a pattern (skips comments)
 */
export function findLine(code: string, pattern: string | RegExp): number {
  const lines = code.split('\n');
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines
    if (isCommentLine(line)) continue;

    // Only search in code part (not inline comments)
    const codePart = getCodePart(line);
    if (regex.test(codePart)) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}

/**
 * Find all lines matching a pattern (skips comments)
 */
export function findAllLines(code: string, pattern: string | RegExp): number[] {
  const lines = code.split('\n');
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const matches: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines
    if (isCommentLine(line)) continue;

    // Only search in code part
    const codePart = getCodePart(line);
    if (regex.test(codePart)) {
      matches.push(i + 1);
    }
  }
  return matches;
}

/**
 * Parse TypeScript test file and find test blocks
 */
export function parseTestBlocks(code: string): Map<string, { startLine: number; endLine: number }> {
  const lines = code.split('\n');
  const blocks = new Map<string, { startLine: number; endLine: number }>();

  let currentBlock: { name: string; startLine: number; braceCount: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match it() or describe() blocks
    const blockMatch = line.match(/(it|describe)\s*\(\s*["'`]([^"'`]+)["'`]/);
    if (blockMatch && !currentBlock) {
      currentBlock = {
        name: blockMatch[2],
        startLine: lineNum,
        braceCount: 0
      };
    }

    if (currentBlock) {
      currentBlock.braceCount += (line.match(/{/g) || []).length;
      currentBlock.braceCount -= (line.match(/}/g) || []).length;

      if (currentBlock.braceCount === 0 && line.includes('}')) {
        blocks.set(currentBlock.name, {
          startLine: currentBlock.startLine,
          endLine: lineNum
        });
        currentBlock = null;
      }
    }
  }

  return blocks;
}

/**
 * Find a function call within a specific test block
 *
 * @param code - Full test code
 * @param blockName - Name of the it() or describe() block
 * @param functionName - Name of the function to find (e.g., 'createMarket')
 * @returns Line number where the function is called, or -1 if not found
 *
 * Example:
 *   findCallInTestBlock(testCode, 'should create a market', 'createMarket')
 *   // Returns line 53 (the actual call), not line 49 (the it() declaration)
 */
export function findCallInTestBlock(code: string, blockName: string, functionName: string): number {
  const lines = code.split('\n');
  const blocks = parseTestBlocks(code);
  const block = blocks.get(blockName);

  if (!block) {
    // Block not found, fall back to global search
    return findLine(code, new RegExp(`\\.${functionName}\\s*\\(`));
  }

  // Search only within the block's line range
  const callPattern = new RegExp(`\\.${functionName}\\s*\\(`);

  for (let i = block.startLine - 1; i < block.endLine; i++) {
    const line = lines[i];

    // Skip comment lines
    if (isCommentLine(line)) continue;

    // Only search in code part
    const codePart = getCodePart(line);
    if (callPattern.test(codePart)) {
      return i + 1; // 1-indexed
    }
  }

  // Not found in block, return -1
  return -1;
}

/**
 * Create a code locator for a specific code string
 * This is the main utility class for tutorials
 */
export class CodeLocator {
  private code: string;
  private lines: string[];
  private functions: Map<string, FunctionLocation>;
  private sections: Map<string, CodeSection>;

  constructor(code: string) {
    this.code = code;
    this.lines = code.split('\n');
    this.functions = parseSolidityFunctions(code);
    this.sections = parseCodeSections(code);
  }

  /**
   * Get function location by name
   */
  getFunction(name: string): [number, number] | null {
    const func = this.functions.get(name);
    return func ? [func.startLine, func.endLine] : null;
  }

  /**
   * Get section location by stage number or id
   */
  getSection(stageOrId: number | string): [number, number] | null {
    let section: CodeSection | undefined;

    if (typeof stageOrId === 'number') {
      // Find by stage number
      for (const s of this.sections.values()) {
        if (s.id.includes(`stage-${stageOrId}`) || s.title?.includes(`Stage ${stageOrId}`)) {
          section = s;
          break;
        }
      }
    } else {
      section = this.sections.get(stageOrId);
    }

    return section ? [section.startLine, section.endLine] : null;
  }

  /**
   * Find line containing specific code
   */
  findLine(pattern: string | RegExp): number {
    return findLine(this.code, pattern);
  }

  /**
   * Find lines containing FHE operation
   */
  findFHECall(operation: string): number {
    return this.findLine(new RegExp(`FHE\\.${operation}\\s*\\(`));
  }

  /**
   * Get all functions
   */
  getAllFunctions(): FunctionLocation[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get all sections
   */
  getAllSections(): CodeSection[] {
    return Array.from(this.sections.values());
  }

  /**
   * Debug: print all found locations
   */
  debug(): void {
    console.log('=== Functions ===');
    for (const [name, loc] of this.functions) {
      console.log(`  ${name}: ${loc.startLine}-${loc.endLine}`);
    }
    console.log('=== Sections ===');
    for (const [id, sec] of this.sections) {
      console.log(`  ${id}: ${sec.startLine}-${sec.endLine} (${sec.title})`);
    }
  }
}

/**
 * Utility to generate tutorial step locations from code
 */
export function generateTutorialLocations(contractCode: string, testCode: string) {
  const contract = new CodeLocator(contractCode);
  const test = new CodeLocator(testCode);

  return {
    contract,
    test,

    // Helper to get contract function lines
    contractFunc: (name: string) => contract.getFunction(name),

    // Helper to find specific FHE call
    fheCall: (op: string) => contract.findFHECall(op),

    // Helper to get test block
    testBlock: (name: string) => {
      const blocks = parseTestBlocks(testCode);
      const block = blocks.get(name);
      return block ? [block.startLine, block.endLine] as [number, number] : null;
    }
  };
}
