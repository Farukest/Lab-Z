import type { TutorialStep } from "@/components/interactive-tutorial";

interface CodeBlock {
  id: string;
  type: string;
  lines: [number, number];
  explanation: string;
  searchTerms: string[];
}

// Map common FHE operations to educational concepts
const FHE_CONCEPTS: Record<string, { term: string; definition: string; example?: string }> = {
  'FHE.fromExternal': {
    term: 'Handle Creation',
    definition: 'Converts external encrypted input to an internal handle (euint64). The handle is a 256-bit reference to encrypted data stored in the FHE coprocessor.',
    example: 'euint64 handle = FHE.fromExternal(externalInput, proof);',
  },
  'FHE.add': {
    term: 'Encrypted Addition',
    definition: 'Adds two encrypted values without decrypting them. Returns a NEW handle pointing to the encrypted result.',
    example: 'euint64 sum = FHE.add(a, b); // a + b, still encrypted',
  },
  'FHE.sub': {
    term: 'Encrypted Subtraction',
    definition: 'Subtracts two encrypted values. Be careful: underflow wraps around since values are unsigned.',
    example: 'euint64 diff = FHE.sub(a, b); // a - b',
  },
  'FHE.mul': {
    term: 'Encrypted Multiplication',
    definition: 'Multiplies two encrypted values. Most expensive FHE operation - use sparingly.',
    example: 'euint64 product = FHE.mul(a, b);',
  },
  'FHE.gt': {
    term: 'Encrypted Comparison (>)',
    definition: 'Compares two encrypted values, returns encrypted boolean (ebool). No one knows the result until decryption.',
    example: 'ebool isGreater = FHE.gt(a, b); // is a > b?',
  },
  'FHE.lt': {
    term: 'Encrypted Comparison (<)',
    definition: 'Returns encrypted boolean indicating if first value is less than second.',
    example: 'ebool isLess = FHE.lt(a, b); // is a < b?',
  },
  'FHE.eq': {
    term: 'Encrypted Equality',
    definition: 'Returns encrypted boolean indicating if two values are equal.',
    example: 'ebool isEqual = FHE.eq(a, b); // is a == b?',
  },
  'FHE.select': {
    term: 'Encrypted Conditional (Ternary)',
    definition: 'The FHE equivalent of condition ? a : b. All three values remain encrypted.',
    example: 'euint64 result = FHE.select(condition, ifTrue, ifFalse);',
  },
  'FHE.allowThis': {
    term: 'Contract Permission',
    definition: 'Grants the contract itself permission to use this handle in future transactions. Required for storage.',
    example: 'FHE.allowThis(handle); // contract can use this',
  },
  'FHE.allow': {
    term: 'User Permission',
    definition: 'Grants a specific address permission to decrypt or use this handle. Required for user decryption.',
    example: 'FHE.allow(handle, msg.sender); // user can decrypt',
  },
  'FHE.allowTransient': {
    term: 'Transient Permission',
    definition: 'Grants temporary permission that expires at the end of the transaction. Useful for passing handles between contracts.',
    example: 'FHE.allowTransient(handle, otherContract);',
  },
  'FHE.isAllowed': {
    term: 'Permission Check',
    definition: 'Checks if an address has permission to access an encrypted handle.',
    example: 'bool hasAccess = FHE.isAllowed(handle, user);',
  },
  'FHE.randEuint64': {
    term: 'Encrypted Random',
    definition: 'Generates cryptographically secure random number, encrypted. No one knows the value until decryption.',
    example: 'euint64 random = FHE.randEuint64();',
  },
  'FHE.makePubliclyDecryptable': {
    term: 'Public Decryption Request',
    definition: 'Step 1 of 3-step async decryption. Marks handle for decryption by the network.',
    example: 'FHE.makePubliclyDecryptable(handle);',
  },
  'FHE.checkSignatures': {
    term: 'Decryption Verification',
    definition: 'Step 3 of 3-step async decryption. Verifies the decrypted value with cryptographic proof.',
    example: 'FHE.checkSignatures(handles, clearValues, proof);',
  },
  'createEncryptedInput': {
    term: 'Client-Side Encryption',
    definition: 'Creates encrypted input on the client before sending to the contract. Uses the contract address for encryption context.',
    example: 'const input = await fhevm.createEncryptedInput(contractAddress, userAddress);',
  },
  'userDecryptEuint': {
    term: 'User Decryption',
    definition: 'Decrypts a value locally using the user\'s private key. Only works if the user has permission (FHE.allow was called).',
    example: 'const value = await fhevm.userDecryptEuint(type, handle, contract, signer);',
  },
};

// Generate tutorial steps from template data
export function generateTutorialSteps(
  blocks: CodeBlock[],
  contractCode: string,
  testCode: string,
  fheOperations?: string[]
): TutorialStep[] {
  const steps: TutorialStep[] = [];

  // If we have explicit blocks, use them
  if (blocks && blocks.length > 0) {
    blocks.forEach((block, index) => {
      // Find concept based on searchTerms
      let concept: TutorialStep['concept'] = undefined;
      for (const term of block.searchTerms) {
        for (const [key, value] of Object.entries(FHE_CONCEPTS)) {
          if (key.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(key.toLowerCase())) {
            concept = value;
            break;
          }
        }
        if (concept) break;
      }

      // Try to find matching test lines (approximate)
      let testLines: [number, number] | undefined;
      const testCodeLines = testCode.split('\n');
      for (let i = 0; i < testCodeLines.length; i++) {
        for (const term of block.searchTerms) {
          if (testCodeLines[i].includes(term)) {
            testLines = [i + 1, Math.min(i + 5, testCodeLines.length)];
            break;
          }
        }
        if (testLines) break;
      }

      steps.push({
        id: block.id,
        title: block.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        contractLines: block.lines,
        testLines,
        explanation: block.explanation,
        concept,
        flowDirection: block.type === 'function' ? 'left-to-right' : 'none',
        duration: 4000,
      });
    });
  }

  // If we have FHE operations, create steps for each
  if (fheOperations && fheOperations.length > 0 && steps.length === 0) {
    fheOperations.forEach((op, index) => {
      const concept = FHE_CONCEPTS[op];
      if (concept) {
        // Find the operation in contract code
        const contractLines = contractCode.split('\n');
        let startLine = 1;
        for (let i = 0; i < contractLines.length; i++) {
          if (contractLines[i].includes(op)) {
            startLine = i + 1;
            break;
          }
        }

        steps.push({
          id: `step-${index + 1}`,
          title: concept.term,
          contractLines: [startLine, startLine + 3],
          explanation: concept.definition,
          concept,
          flowDirection: 'left-to-right',
          duration: 4000,
        });
      }
    });
  }

  return steps;
}

// Default steps for common patterns
export const DEFAULT_STEPS: Record<string, TutorialStep[]> = {
  'handle-journey': [
    {
      id: 'birth',
      title: 'Handle Birth',
      contractLines: [85, 100],
      testLines: [20, 30],
      explanation: 'A handle is created when you call FHE.asEuint64() or FHE.fromExternal(). This is the "birth" of an encrypted value.',
      concept: FHE_CONCEPTS['FHE.fromExternal'],
      flowDirection: 'left-to-right',
      duration: 5000,
    },
    {
      id: 'permission',
      title: 'Permission Grant',
      contractLines: [120, 140],
      explanation: 'Handles have Access Control Lists (ACL). You must grant permission for addresses to use or decrypt handles.',
      concept: FHE_CONCEPTS['FHE.allow'],
      flowDirection: 'none',
      duration: 4000,
    },
    {
      id: 'operation',
      title: 'Operations Create New Handles',
      contractLines: [156, 180],
      explanation: 'FHE operations like add(), mul(), gt() create NEW handles. The original handles remain unchanged.',
      concept: FHE_CONCEPTS['FHE.add'],
      flowDirection: 'none',
      duration: 4000,
    },
    {
      id: 'storage',
      title: 'Storage Persistence',
      contractLines: [216, 225],
      explanation: 'Handles can be stored in contract state. They persist between transactions, but require allowThis() permission.',
      concept: FHE_CONCEPTS['FHE.allowThis'],
      flowDirection: 'none',
      duration: 4000,
    },
    {
      id: 'death',
      title: 'Handle Death (Decryption)',
      contractLines: [236, 260],
      testLines: [50, 65],
      explanation: 'Decryption is the "death" of a handle - the encrypted value becomes public. This uses the 3-step async pattern.',
      concept: FHE_CONCEPTS['FHE.makePubliclyDecryptable'],
      flowDirection: 'right-to-left',
      duration: 5000,
    },
  ],
};
