import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Boolean Operations Tutorial
 *
 * Demonstrates ebool type and boolean FHE operations:
 * - FHE.not() - boolean negation
 * - FHE.and() - boolean AND
 * - FHE.or() - boolean OR
 * - FHE.asEbool() - plaintext to ebool
 * - Comparisons returning ebool (gt, eq)
 */
export const booleanTutorial: Tutorial = {
  templateId: 'boolean',
  title: 'Boolean Operations Tutorial',
  description: 'Encrypted boolean logic with ebool type',

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
          contract: { pattern: 'contract BooleanOps' },
          leftExplanation: 'Deploy BooleanOps contract for boolean operation demos.',
          rightExplanation: 'Contract stores encrypted boolean results with ebool type.',
          flow: 'test-to-contract',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Boolean NOT
    // =========================================================================
    {
      id: 'boolean-not',
      title: 'Boolean NOT',
      steps: [
        {
          id: 'encrypt-bool',
          title: 'Encrypt Boolean Input',
          test: { pattern: 'addBool(true)' },
          leftExplanation: 'Client encrypts boolean value using addBool(). Value stays private.',
          flow: 'test-only',
          concept: FHE_CONCEPTS.ENCRYPTED_INPUT,
          duration: 3000,
        },
        {
          id: 'call-not',
          title: 'Call NOT Operation',
          test: { block: 'should negate true to false', call: 'notValue' },
          contract: { method: 'notValue' },
          leftExplanation: 'Test calls notValue() with encrypted boolean.',
          rightExplanation: 'Contract applies FHE.not() to flip the encrypted boolean.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-not',
          title: 'FHE.not() - Boolean Negation',
          contract: { fheOp: 'not' },
          rightExplanation: 'FHE.not() flips the encrypted boolean: true becomes false, false becomes true.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.not',
            description: 'Negate encrypted boolean'
          },
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Boolean AND
    // =========================================================================
    {
      id: 'boolean-and',
      title: 'Boolean AND',
      steps: [
        {
          id: 'encrypt-two-bools',
          title: 'Encrypt Two Booleans',
          test: { pattern: '.addBool(true)\\n        .addBool(true)' },
          leftExplanation: 'Client encrypts two boolean values for AND operation.',
          flow: 'test-only',
          duration: 2500,
        },
        {
          id: 'call-and',
          title: 'Call AND Operation',
          test: { block: 'should return true when both are true', call: 'andBools' },
          contract: { method: 'andBools' },
          leftExplanation: 'Test calls andBools() with two encrypted booleans.',
          rightExplanation: 'Contract applies FHE.and() to combine the values.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-and',
          title: 'FHE.and() - Boolean AND',
          contract: { fheOp: 'and' },
          rightExplanation: 'FHE.and() returns encrypted true only if BOTH inputs are true.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.and',
            description: 'Encrypted AND operation'
          },
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Boolean OR
    // =========================================================================
    {
      id: 'boolean-or',
      title: 'Boolean OR',
      steps: [
        {
          id: 'call-or',
          title: 'Call OR Operation',
          test: { block: 'should return true when one is true', call: 'orBools' },
          contract: { method: 'orBools' },
          leftExplanation: 'Test calls orBools() with two encrypted booleans.',
          rightExplanation: 'Contract applies FHE.or() to combine the values.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-or',
          title: 'FHE.or() - Boolean OR',
          contract: { fheOp: 'or' },
          rightExplanation: 'FHE.or() returns encrypted true if EITHER input is true.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.or',
            description: 'Encrypted OR operation'
          },
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Plaintext to Encrypted
    // =========================================================================
    {
      id: 'plaintext-convert',
      title: 'Plaintext Conversion',
      steps: [
        {
          id: 'call-plain-bool',
          title: 'Set Plaintext Boolean',
          test: { block: 'should convert plaintext true to encrypted', call: 'setPlainBool' },
          contract: { method: 'setPlainBool' },
          leftExplanation: 'Test calls setPlainBool() with a plaintext boolean.',
          rightExplanation: 'WARNING: This exposes the value on-chain! Only use for initialization.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-as-ebool',
          title: 'FHE.asEbool() - Create from Plaintext',
          contract: { fheOp: 'asEbool' },
          rightExplanation: 'FHE.asEbool(value) converts plaintext to encrypted boolean. Value is visible!',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEbool',
            description: 'Convert plaintext to encrypted boolean'
          },
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Comparison to ebool
    // =========================================================================
    {
      id: 'comparison',
      title: 'Comparison Operations',
      steps: [
        {
          id: 'call-is-greater',
          title: 'Compare: Is Greater?',
          test: { block: 'should return true when a > b', call: 'isGreater' },
          contract: { method: 'isGreater' },
          leftExplanation: 'Test compares two encrypted integers: is a > b?',
          rightExplanation: 'FHE.gt() returns ebool - encrypted comparison result.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-gt',
          title: 'FHE.gt() - Greater Than',
          contract: { fheOp: 'gt' },
          rightExplanation: 'FHE.gt(a, b) returns ebool. The actual values stay hidden.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.gt',
            description: 'Encrypted greater-than comparison'
          },
          duration: 3500,
        },
        {
          id: 'call-is-equal',
          title: 'Compare: Is Equal?',
          test: { block: 'should check equality with eq()', call: 'isEqual' },
          contract: { method: 'isEqual' },
          leftExplanation: 'Test checks if two encrypted values are equal.',
          rightExplanation: 'FHE.eq() returns ebool - useful for equality checks without revealing values.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-eq',
          title: 'FHE.eq() - Equality Check',
          contract: { fheOp: 'eq' },
          rightExplanation: 'FHE.eq(a, b) returns encrypted true if values are equal, false otherwise.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.eq',
            description: 'Encrypted equality comparison'
          },
          duration: 3500,
        },
      ],
    },
  ],
};
