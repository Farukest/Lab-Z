export type Category =
  | "basics"
  | "encryption"
  | "decryption"
  | "acl"
  | "handles"
  | "input-proofs"
  | "antipatterns"
  | "security"
  | "openzeppelin"
  | "advanced";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type BlockType =
  | "import"
  | "state"
  | "constructor"
  | "function"
  | "modifier"
  | "event"
  | "error"
  | "comment";

export interface CodeBlock {
  id: string;
  type: BlockType;
  lines: [number, number];
  explanation: string;
  searchTerms: string[];
}

export interface Template {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  longDescription?: string;
  blocks: CodeBlock[];
  contractCode: string;
  testCode: string;
  relatedTemplates?: string[];
  prerequisites?: string[];
  nextSteps?: string[];
}
