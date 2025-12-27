import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Handle vs Value Tutorial
 *
 * Demonstrates that FHE handles are REFERENCES, not values.
 * Critical for understanding how encrypted data works in FHEVM.
 *
 * Key Concepts:
 * 1. Handles are references, not copies
 * 2. Handle creation is deterministic
 * 3. Operations create new handles
 * 4. Raw comparison vs value comparison (FHE.eq)
 */
export const handleVsValueTutorial: Tutorial = {
  templateId: 'handle-vs-value',
  title: 'Handle vs Value Tutorial',
  description: 'Understanding that FHE handles are references, not values',

  modes: {
    lineByLine: true,
    fheStepsOnly: true,
  },

  sections: [
    // =========================================================================
    //                    SECTION: Assignment Is Not Copying
    // =========================================================================
    {
      id: 'assignment',
      title: 'Assignment Is Not Copying',
      steps: [
        {
          id: 'deploy',
          title: 'Contract Deployment',
          test: { method: 'deployFixture' },
          contract: { pattern: 'contract HandleVsValue' },
          leftExplanation: 'Deploy HandleVsValue contract for demonstration.',
          rightExplanation: 'Contract with multiple demos showing handle behavior.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'demo-assignment',
          title: 'Demo: Assignment Is Not Copy',
          test: { block: 'should demonstrate that assignment creates same handle', call: 'demo_assignmentIsNotCopy' },
          contract: { method: 'demo_assignmentIsNotCopy' },
          leftExplanation: 'Test calls demo_assignmentIsNotCopy() and checks if handles are identical.',
          rightExplanation: 'Creates handleA, then assigns handleB = handleA. Both are same handle!',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-create-handle',
          title: 'FHE.asEuint64() - Create Handle',
          contract: { pattern: 'euint64 handleA = FHE.asEuint64(100)' },
          rightExplanation: 'Create an encrypted handle from plaintext value 100.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEuint64',
            description: 'Create encrypted handle from plaintext'
          },
          concept: FHE_CONCEPTS.HANDLE,
          duration: 3500,
        },
        {
          id: 'assignment-alias',
          title: 'Assignment Creates Alias',
          contract: { pattern: 'euint64 handleB = handleA' },
          rightExplanation: 'handleB = handleA does NOT create a copy. Both point to the SAME encrypted data.',
          flow: 'contract-only',
          duration: 3000,
        },
        {
          id: 'verify-same',
          title: 'Verify Handles Are Same',
          contract: { pattern: 'bool areSame = (rawA == rawB)' },
          rightExplanation: 'Comparing raw handle values confirms they are identical. No separate copy exists.',
          flow: 'contract-only',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Determinism
    // =========================================================================
    {
      id: 'determinism',
      title: 'Handle Determinism',
      steps: [
        {
          id: 'demo-determinism',
          title: 'Demo: Same Value = Same Handle',
          test: { block: 'should produce same handle for same value', call: 'demo_determinism' },
          contract: { method: 'demo_determinism' },
          leftExplanation: 'Test verifies that encrypting the same value twice gives the same handle.',
          rightExplanation: 'FHE.asEuint64(42) called twice produces identical handles.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'create-twice',
          title: 'Create Same Value Twice',
          contract: { pattern: 'euint64 handleA = FHE.asEuint64(42)' },
          rightExplanation: 'First call creates handle. Second call with same value returns SAME handle.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEuint64',
            description: 'Deterministic handle creation'
          },
          duration: 3500,
        },
        {
          id: 'demo-different',
          title: 'Demo: Different Values = Different Handles',
          test: { block: 'should produce different handles for different values', call: 'demo_differentValues' },
          contract: { method: 'demo_differentValues' },
          leftExplanation: 'Test verifies that different values produce different handles.',
          rightExplanation: 'FHE.asEuint64(100) and FHE.asEuint64(200) are different handles.',
          flow: 'test-to-contract',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Operations Create New Handles
    // =========================================================================
    {
      id: 'operations',
      title: 'Operations Create New Handles',
      steps: [
        {
          id: 'demo-ops-new',
          title: 'Demo: Operations Create New Handles',
          test: { block: 'should create different handle from operation vs direct', call: 'demo_operationsCreateNewHandles' },
          contract: { method: 'demo_operationsCreateNewHandles' },
          leftExplanation: 'Test compares direct creation vs operation result.',
          rightExplanation: 'FHE.asEuint64(100) != FHE.add(50, 50) even though both represent 100.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-add-new',
          title: 'FHE.add() Creates New Handle',
          contract: { pattern: 'euint64 handleFromAdd = FHE.add(fifty1, fifty2)' },
          rightExplanation: 'FHE.add() returns a NEW handle. Different from direct creation even if same value.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.add',
            description: 'Operations produce unique handles'
          },
          concept: FHE_CONCEPTS.ADD,
          duration: 3500,
        },
        {
          id: 'demo-op-determinism',
          title: 'Demo: Operation Determinism',
          test: { block: 'should produce same handle for repeated operation', call: 'demo_operationDeterminism' },
          contract: { method: 'demo_operationDeterminism' },
          leftExplanation: 'Test verifies that same operation on same inputs gives same handle.',
          rightExplanation: 'FHE.add(A, B) called twice with same A and B returns same handle.',
          flow: 'test-to-contract',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Three-Way Comparison
    // =========================================================================
    {
      id: 'three-way',
      title: 'Three-Way Comparison',
      steps: [
        {
          id: 'demo-three-way',
          title: 'Demo: Complete Handle Identity',
          test: { block: 'should show complete handle identity rules', call: 'demo_threeWayComparison' },
          contract: { method: 'demo_threeWayComparison' },
          leftExplanation: 'Test compares three handles representing the same value (30).',
          rightExplanation: 'A=direct, B=direct, C=operation. A==B (same origin), A!=C (different origin).',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'direct-same',
          title: 'Direct Creations Are Same',
          contract: { pattern: 'rawDirect1 == rawDirect2' },
          rightExplanation: 'Two direct creations of FHE.asEuint64(30) produce the same handle.',
          flow: 'contract-only',
          duration: 3000,
        },
        {
          id: 'direct-op-different',
          title: 'Direct vs Operation Are Different',
          contract: { pattern: 'rawDirect1 == rawAdded' },
          rightExplanation: 'Direct creation and operation result are different handles, same value.',
          flow: 'contract-only',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Encrypted Value Comparison
    // =========================================================================
    {
      id: 'value-comparison',
      title: 'Encrypted Value Comparison',
      steps: [
        {
          id: 'demo-encrypted-compare',
          title: 'Demo: FHE.eq() Compares Values',
          test: { block: 'should compare encrypted values with FHE.eq', call: 'demo_encryptedComparison' },
          contract: { method: 'demo_encryptedComparison' },
          leftExplanation: 'Test demonstrates FHE.eq() for encrypted value comparison.',
          rightExplanation: 'FHE.eq(A, B) returns encrypted boolean - are VALUES equal (not handles)?',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-eq',
          title: 'FHE.eq() - Encrypted Comparison',
          contract: { fheOp: 'eq' },
          rightExplanation: 'FHE.eq(handleA, handleB) returns ebool. Result is encrypted - you need to decrypt to see it.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.eq',
            description: 'Compare encrypted values, returns encrypted bool'
          },
          duration: 4000,
        },
        {
          id: 'key-insight',
          title: 'Key Insight',
          contract: { pattern: 'areValuesEqual' },
          rightExplanation: 'Raw handle comparison = same REFERENCE. FHE.eq() = same VALUE (encrypted result).',
          flow: 'contract-only',
          duration: 3500,
        },
      ],
    },
  ],
};
