import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Age Gate Tutorial
 *
 * Age verification without revealing birth date.
 * Proves age >= threshold without exposing exact date of birth.
 *
 * Use Cases:
 * - Adult content access (18+)
 * - Alcohol/tobacco purchases (21+)
 * - Senior discounts (65+)
 * - Age-restricted gaming
 *
 * FHE Operations:
 * - fromExternal: Receive encrypted birth date
 * - sub: Calculate age from current time - birth date
 * - div: Convert seconds to years
 * - ge: Check if age meets requirement
 */
export const ageGateTutorial: Tutorial = {
  templateId: 'age-gate',
  title: 'Age Gate Tutorial',
  description: 'Age verification without revealing birth date',

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
          test: { method: 'before' },
          contract: { pattern: 'contract AgeGate' },
          leftExplanation: 'Deploy AgeGate contract with validity period for verifications.',
          rightExplanation: 'Contract is deployed. Deployer becomes initial authorized issuer.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'verify-issuer',
          title: 'Verify Initial Issuer',
          test: { pattern: 'should have deployer as initial issuer' },
          contract: { pattern: '_issuers[msg.sender] = true' },
          leftExplanation: 'Test verifies the deployer is set as authorized issuer.',
          rightExplanation: 'Constructor sets deployer as trusted identity issuer.',
          flow: 'test-to-contract',
          duration: 2500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Issuer Management
    // =========================================================================
    {
      id: 'issuer-management',
      title: 'Issuer Management',
      steps: [
        {
          id: 'add-issuer',
          title: 'Add New Issuer',
          test: { block: 'should allow issuer to add new issuer', call: 'addIssuer' },
          contract: { method: 'addIssuer' },
          leftExplanation: 'Existing issuer adds a new authorized issuer.',
          rightExplanation: 'Only authorized issuers can add new issuers. Access control pattern.',
          flow: 'test-to-contract',
          duration: 2500,
        },
        {
          id: 'remove-issuer',
          title: 'Remove Issuer',
          test: { block: 'should allow issuer to remove issuer', call: 'removeIssuer' },
          contract: { method: 'removeIssuer' },
          leftExplanation: 'Issuer removes another issuer from the authorized list.',
          rightExplanation: 'Removed issuer can no longer register birth dates.',
          flow: 'test-to-contract',
          duration: 2500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Birth Date Registration
    // =========================================================================
    {
      id: 'registration',
      title: 'Birth Date Registration',
      steps: [
        {
          id: 'encrypt-birthdate',
          title: 'Encrypt Birth Date',
          test: { pattern: 'createEncryptedInput' },
          leftExplanation: 'Issuer encrypts user birth date as Unix timestamp. Date stays private.',
          flow: 'test-only',
          concept: FHE_CONCEPTS.ENCRYPTED_INPUT,
          duration: 3000,
        },
        {
          id: 'register-call',
          title: 'Register Birth Date',
          test: { block: 'should register birth date for user', call: 'registerBirthDate' },
          contract: { method: 'registerBirthDate' },
          leftExplanation: 'Issuer calls registerBirthDate() with encrypted timestamp and proof.',
          rightExplanation: 'Contract validates proof and stores encrypted birth date for user.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-from-external',
          title: 'FHE.fromExternal() - Validate Input',
          contract: { fheOp: 'fromExternal' },
          rightExplanation: 'FHE.fromExternal() validates ZK proof and creates internal handle for birth date.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.fromExternal',
            description: 'Validate proof and store encrypted birth date'
          },
          concept: FHE_CONCEPTS.FROM_EXTERNAL,
          duration: 3500,
        },
        {
          id: 'fhe-allow-birthdate',
          title: 'FHE.allowThis() - Store Permission',
          contract: { pattern: 'FHE\\.allowThis\\(birthDate\\)' },
          rightExplanation: 'Contract grants itself permission to use birth date for future age calculations.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allowThis',
            description: 'Allow contract to access birth date'
          },
          concept: FHE_CONCEPTS.ALLOW_THIS,
          duration: 3000,
        },
        {
          id: 'fhe-allow-user',
          title: 'FHE.allow() - User Permission',
          contract: { pattern: 'FHE\\.allow\\(birthDate, user\\)' },
          rightExplanation: 'User is granted permission to decrypt their own birth date if needed.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant user access to their birth date'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Age Verification
    // =========================================================================
    {
      id: 'verification',
      title: 'Age Verification',
      steps: [
        {
          id: 'verify-call',
          title: 'Request Age Verification',
          test: { block: 'should verify age meets requirement (18+)', call: 'verifyAge' },
          contract: { method: 'verifyAge' },
          leftExplanation: 'User requests age verification for a minimum age (e.g., 18+).',
          rightExplanation: 'Contract calculates age and checks if requirement is met - all encrypted.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-current-time',
          title: 'FHE.asEuint64() - Encrypt Current Time',
          contract: { pattern: 'FHE\\.asEuint64\\(uint64\\(block\\.timestamp\\)\\)' },
          rightExplanation: 'Current block timestamp is converted to encrypted form for secure calculation.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEuint64',
            description: 'Encrypt current timestamp'
          },
          concept: FHE_CONCEPTS.HANDLE,
          duration: 3000,
        },
        {
          id: 'fhe-sub-age',
          title: 'FHE.sub() - Calculate Age in Seconds',
          contract: { fheOp: 'sub' },
          rightExplanation: 'Age in seconds = currentTime - birthDate. Both values stay encrypted.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.sub',
            description: 'Calculate age in seconds'
          },
          duration: 3500,
        },
        {
          id: 'fhe-div-years',
          title: 'FHE.div() - Convert to Years',
          contract: { fheOp: 'div' },
          rightExplanation: 'Age in years = ageInSeconds / SECONDS_PER_YEAR. Division uses plaintext divisor.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.div',
            description: 'Convert seconds to years'
          },
          duration: 3500,
        },
        {
          id: 'fhe-ge-check',
          title: 'FHE.ge() - Check Requirement',
          contract: { fheOp: 'ge' },
          rightExplanation: 'Check if age >= minAge. Result is encrypted boolean - actual age is never revealed.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.ge',
            description: 'Check if age meets minimum requirement'
          },
          duration: 4000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Access Control
    // =========================================================================
    {
      id: 'access-control',
      title: 'Access Control',
      steps: [
        {
          id: 'grant-access',
          title: 'Grant Resource Access',
          test: { block: 'should grant access based on age', call: 'grantAccess' },
          contract: { method: 'grantAccess' },
          leftExplanation: 'User requests access to a specific resource with age requirement.',
          rightExplanation: 'Contract calculates age and returns encrypted access result.',
          flow: 'test-to-contract',
          duration: 3000,
        },
        {
          id: 'fhe-allow-result',
          title: 'FHE.allow() - Access Result',
          contract: { pattern: 'FHE\\.allow\\(hasAccess, msg\\.sender\\)' },
          rightExplanation: 'User is granted permission to decrypt the access result boolean.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Grant user access to result'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3000,
        },
      ],
    },
  ],
};
