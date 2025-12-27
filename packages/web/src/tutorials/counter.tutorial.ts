import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Counter Tutorial
 *
 * Simple encrypted counter - the "Hello World" of FHE.
 * Demonstrates basic FHEVM operations:
 * - Encrypted state storage
 * - FHE.fromExternal for input validation
 * - FHE.add and FHE.sub for arithmetic
 * - ACL permissions with allowThis and allow
 */
export const counterTutorial: Tutorial = {
  templateId: 'counter',
  title: 'FHE Counter Tutorial',
  description: 'Simple encrypted counter - the Hello World of FHE',

  modes: {
    lineByLine: true,
    fheStepsOnly: true,
  },

  sections: [
    // =========================================================================
    //                    SECTION: Setup
    // =========================================================================
    {
      id: 'setup',
      title: 'Setup',
      steps: [
        {
          id: 'deploy',
          title: 'Contract Deployment',
          test: { method: 'deployFixture' },
          contract: { pattern: 'contract FHECounter' },
          leftExplanation: 'Deploy FHECounter contract. Fresh instance for each test.',
          rightExplanation: 'Simple counter with encrypted state. Uses euint32 for the count.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'initial-state',
          title: 'Initial State',
          test: { pattern: 'should have uninitialized count' },
          contract: { method: 'getCount' },
          leftExplanation: 'Test verifies counter starts at zero (bytes32(0) for uninitialized).',
          rightExplanation: 'getCount() returns the encrypted handle. Zero hash means uninitialized.',
          flow: 'test-to-contract',
          duration: 2500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Increment
    // =========================================================================
    {
      id: 'increment',
      title: 'Increment Counter',
      steps: [
        {
          id: 'encrypt-input',
          title: 'Client-Side Encryption',
          test: { pattern: 'createEncryptedInput' },
          leftExplanation: 'Client encrypts the increment value (e.g., 5). Value stays private.',
          flow: 'test-only',
          concept: FHE_CONCEPTS.ENCRYPTED_INPUT,
          duration: 3000,
        },
        {
          id: 'call-increment',
          title: 'Call Increment',
          test: { block: 'should increment counter by encrypted value', call: 'increment' },
          contract: { method: 'increment' },
          leftExplanation: 'Test calls increment() with encrypted value and ZK proof.',
          rightExplanation: 'Contract receives encrypted input and validates proof.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-from-external',
          title: 'FHE.fromExternal() - Validate Input',
          contract: { fheOp: 'fromExternal' },
          rightExplanation: 'FHE.fromExternal() validates ZK proof and converts external input to internal handle.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.fromExternal',
            description: 'Validate proof and create internal handle'
          },
          concept: FHE_CONCEPTS.FROM_EXTERNAL,
          duration: 3500,
        },
        {
          id: 'fhe-add',
          title: 'FHE.add() - Encrypted Addition',
          contract: { fheOp: 'add' },
          rightExplanation: 'FHE.add(_count, evalue) adds encrypted values. Result is new encrypted handle.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.add',
            description: 'Add encrypted values'
          },
          concept: FHE_CONCEPTS.ADD,
          duration: 3500,
        },
        {
          id: 'fhe-allow-this',
          title: 'FHE.allowThis() - Contract Access',
          contract: { pattern: 'FHE\\.allowThis\\(_count\\)' },
          rightExplanation: 'Contract grants itself permission to use the new count in future calls.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allowThis',
            description: 'Allow contract to access count'
          },
          concept: FHE_CONCEPTS.ALLOW_THIS,
          duration: 3000,
        },
        {
          id: 'fhe-allow-user',
          title: 'FHE.allow() - User Access',
          contract: { pattern: 'FHE\\.allow\\(_count, msg\\.sender\\)' },
          rightExplanation: 'Caller gets permission to decrypt the count value off-chain.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant caller decryption access'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
        {
          id: 'decrypt-result',
          title: 'Decrypt Result',
          test: { pattern: 'userDecryptEuint' },
          leftExplanation: 'Client decrypts the new count using userDecryptEuint(). Only works with permission.',
          flow: 'test-only',
          concept: FHE_CONCEPTS.USER_DECRYPT,
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Decrement
    // =========================================================================
    {
      id: 'decrement',
      title: 'Decrement Counter',
      steps: [
        {
          id: 'call-decrement',
          title: 'Call Decrement',
          test: { block: 'should decrement counter by encrypted value', call: 'decrement' },
          contract: { method: 'decrement' },
          leftExplanation: 'Test increments first (to have value), then decrements.',
          rightExplanation: 'Decrement works same as increment but uses FHE.sub().',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-sub',
          title: 'FHE.sub() - Encrypted Subtraction',
          contract: { fheOp: 'sub' },
          rightExplanation: 'FHE.sub(_count, evalue) subtracts encrypted values. No underflow check in this demo.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.sub',
            description: 'Subtract encrypted values'
          },
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Multiple Users
    // =========================================================================
    {
      id: 'multi-user',
      title: 'Multiple Users',
      steps: [
        {
          id: 'multi-user-test',
          title: 'Multi-User Interaction',
          test: { block: 'should increment counter multiple times', call: 'increment' },
          contract: { method: 'increment' },
          leftExplanation: 'Counter is incremented multiple times. Each call updates permissions for the caller.',
          rightExplanation: 'FHE.allow() grants access to msg.sender each time. Latest caller can decrypt.',
          flow: 'test-to-contract',
          duration: 3500,
        },
      ],
    },
  ],
};
