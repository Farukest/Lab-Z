import type { Translations } from '../types';

/**
 * English Translations (Default)
 */
export const en: Translations = {
  // Common UI
  common: {
    back: 'back',
    copyContract: 'copy contract',
    copied: 'copied',
    download: 'download .zip',
    loading: 'Loading...',
    notFound: 'Template not found',
    backToTemplates: 'back to templates',
  },

  // Tutorial UI
  tutorial: {
    stepOf: 'Step {current} of {total}',
    autoPlay: 'Auto-play',
    pause: 'Pause',
    previous: 'Previous',
    next: 'Next',
    showFheOnly: 'FHE Steps Only',
    showAllSteps: 'All Steps',
    testPanel: 'TEST',
    contractPanel: 'CONTRACT',
    clientLabel: 'CLIENT',
    onChainLabel: 'ON-CHAIN',
    concept: 'Concept',
    fheCall: 'FHE Operation',
    expand: '+Detail',
    collapse: '-Close',
    goToStep: 'Go to step',
    ready: 'Ready',
    startTutorial: 'Start Tutorial',
    clickPlayToStart: 'Click Play to start the tutorial or select a step above.',
    learnStepByStep: 'Learn {name} step by step.',
    play: 'Play',
  },

  // Handle Journey Tutorial
  handleJourney: {
    sections: {
      birth: {
        title: 'Birth',
        description: 'Handle creation',
      },
      permission: {
        title: 'Permission',
        description: 'ACL grants',
      },
      operation: {
        title: 'Operation',
        description: 'FHE operations',
      },
      storage: {
        title: 'Storage',
        description: 'State persistence',
      },
      death: {
        title: 'Death',
        description: 'Decryption',
      },
    },

    steps: {
      // Stage 1: Birth
      deploy: {
        title: 'Contract Deploy',
        leftExplanation: 'Test: Contract is deployed via deployFixture() function.',
        rightExplanation: 'Contract: HandleJourney has been deployed.',
      },
      callBirth: {
        title: 'Contract Call',
        leftExplanation: 'Test: Calling contract.stage1_birthFromPlaintext(secretValue).',
        rightExplanation: 'Contract: The stage1_birthFromPlaintext(value) function is executing.',
      },
      fheAsEuint64: {
        title: 'FHE.asEuint64() - Handle is Born',
        rightExplanation: 'HANDLE IS BORN! FHE.asEuint64(value) was called. The plaintext value is being encrypted.',
        fheDescription: 'Plaintext to encrypted handle conversion',
      },
      callBirthEncrypted: {
        title: 'Birth with Encrypted Input',
        leftExplanation: 'Test: Sending encrypted input via client-side encryption.',
        rightExplanation: 'Contract: FHE.fromExternal converts encrypted input to a handle.',
      },
      fheFromExternal: {
        title: 'FHE.fromExternal() - Input Validation',
        rightExplanation: 'FHE.fromExternal(input, proof) - ZK proof is validated, handle is created.',
        fheDescription: 'External encrypted input to internal handle',
      },

      // Stage 2: Permission
      callGrantPerm: {
        title: 'Permanent Permission Call',
        leftExplanation: 'Test: Calling contract.stage2_grantPermanentPermission().',
        rightExplanation: 'Contract: Permanent permission will be granted to msg.sender address.',
      },
      fheAllow: {
        title: 'FHE.allow() - Permanent Permission',
        rightExplanation: 'FHE.allow(storedHandle, msg.sender) - Caller can now use this handle.',
        fheDescription: 'Permanent permission - valid across all transactions',
      },
      callTransientPerm: {
        title: 'Transient Permission Call',
        leftExplanation: 'Test: Calling contract.stage2_grantTransientPermission(bob.address).',
        rightExplanation: 'Contract: FHE.allowTransient() will grant temporary permission.',
      },
      fheAllowTransient: {
        title: 'FHE.allowTransient() - Temporary Permission',
        rightExplanation: 'FHE.allowTransient(storedHandle, to) - Valid ONLY within THIS transaction.',
        fheDescription: 'Temporary permission - expires when transaction ends',
      },

      // Stage 3: Operation
      callOpAdd: {
        title: 'Add Operation Call',
        leftExplanation: 'Test: Calling contract.stage3_operationAdd().',
        rightExplanation: 'Contract: Two encrypted handles will be added together.',
      },
      fheAdd: {
        title: 'FHE.add() - Child Handle is Born',
        rightExplanation: 'NEW HANDLE IS BORN! FHE.add(storedHandle, secondHandle) = new child handle.',
        fheDescription: 'Add two encrypted values, return NEW handle',
      },
      callOpCompare: {
        title: 'Compare Operation',
        leftExplanation: 'Test: Calling contract.stage3_operationCompare().',
        rightExplanation: 'Contract: Handles are being compared, result is ebool.',
      },
      fheLt: {
        title: 'FHE.lt() - Encrypted Compare',
        rightExplanation: 'FHE.lt(storedHandle, secondHandle) - Encrypted comparison, result is ebool.',
        fheDescription: 'Less than comparison, returns ebool',
      },
      callOpSelect: {
        title: 'Select Operation',
        leftExplanation: 'Test: Calling contract.stage3_operationSelect().',
        rightExplanation: 'Contract: Conditional selection - which one is selected remains SECRET!',
      },
      fheSelect: {
        title: 'FHE.select() - Encrypted Ternary',
        rightExplanation: 'FHE.select(condition, optionA, optionB) - Encrypted if/else, selection is secret.',
        fheDescription: 'Encrypted ternary operator',
      },

      // Stage 4: Storage
      callStore: {
        title: 'Storage Call',
        leftExplanation: 'Test: Calling contract.stage4_storeOperationResult().',
        rightExplanation: 'Contract: Operation result will be saved as storedHandle.',
      },
      storageAssign: {
        title: 'Handle is Written to Storage',
        rightExplanation: 'storedHandle = resultHandle - Handle is now in contract state.',
      },
      callTransfer: {
        title: 'Handle Transfer',
        leftExplanation: 'Test: Calling contract.stage4_transferHandle(bob.address).',
        rightExplanation: 'Contract: Handle is being transferred to bob.address.',
      },

      // Stage 5: Death
      callRequestDecrypt: {
        title: 'Step 1: Decryption Request',
        leftExplanation: 'Test: Calling contract.stage5_requestDecryption().',
        rightExplanation: 'Contract: 3-Step Async Decryption begins.',
      },
      makePubliclyDecryptable: {
        title: 'FHE.makePubliclyDecryptable()',
        rightExplanation: 'FHE.makePubliclyDecryptable(storedHandle) - Handle is ready for off-chain decrypt.',
        fheDescription: 'Marks handle for public decryption',
      },
      getHandleDecrypt: {
        title: 'Step 2: Get Handle',
        leftExplanation: 'Test: Getting handle for off-chain publicDecrypt().',
        rightExplanation: 'Contract: Returning bytes32 via euint64.unwrap(storedHandle).',
      },
      finalizeDecrypt: {
        title: 'Step 3: Finalize Decryption',
        rightExplanation: 'FHE.checkSignatures() validates the proof. Handle "dies".',
        fheDescription: 'Decrypt proof validation',
      },
    },
  },

  // FHE Concepts
  concepts: {
    handle: {
      term: 'Handle',
      definition: 'A 256-bit reference pointing to encrypted data in the FHE coprocessor. The handle itself does not contain the encrypted value, it only references it.',
      example: 'euint64 handle = FHE.asEuint64(42);',
    },
    encryptedInput: {
      term: 'Encrypted Input',
      definition: 'User input encrypted with client-side SDK. Consists of two parts: handles[] (encrypted values) and inputProof (ZK proof).',
      example: 'const encrypted = await fhevm.createEncryptedInput(contractAddr, userAddr).add64(42n).encrypt();',
    },
    fromExternal: {
      term: 'FHE.fromExternal()',
      definition: 'Converts external encrypted input (externalEuint64) to internal handle (euint64). ZK proof is validated during this conversion.',
      example: 'euint64 handle = FHE.fromExternal(externalInput, inputProof);',
    },
    allowThis: {
      term: 'FHE.allowThis()',
      definition: 'Grants the contract itself permission to use this handle. Required for storing in state or using in future transactions.',
      example: 'FHE.allowThis(handle);',
    },
    allow: {
      term: 'FHE.allow()',
      definition: 'Grants a specific address permission to decrypt or use this handle. Permanent permission.',
      example: 'FHE.allow(handle, msg.sender);',
    },
    allowTransient: {
      term: 'FHE.allowTransient()',
      definition: 'Temporary permission - valid only for this transaction duration. Used for passing handles between contracts.',
      example: 'FHE.allowTransient(handle, otherContract);',
    },
    add: {
      term: 'FHE.add()',
      definition: 'Adds two encrypted values. Result is a NEW handle - original handles remain unchanged.',
      example: 'euint64 sum = FHE.add(a, b);',
    },
    lt: {
      term: 'FHE.lt()',
      definition: 'Compares two encrypted values (less than). Result is an ebool handle - which is larger remains secret.',
      example: 'ebool isLess = FHE.lt(a, b); // a < b ?',
    },
    select: {
      term: 'FHE.select()',
      definition: 'Encrypted ternary operator. Condition is ebool, both options are encrypted. Which one is selected remains secret - no branching leak.',
      example: 'euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);',
    },
    makePubliclyDecryptable: {
      term: 'FHE.makePubliclyDecryptable()',
      definition: 'Step 1 of 3-Step Async Decryption. Marks the handle for off-chain decrypt. Then publicDecrypt() is called via SDK.',
      example: 'FHE.makePubliclyDecryptable(handle); // Step 1',
    },
    checkSignatures: {
      term: 'FHE.checkSignatures()',
      definition: 'Step 3 of 3-Step Async Decryption. Validates the off-chain decrypt result and proof. If successful, value is now public.',
      example: 'FHE.checkSignatures(handles, cleartexts, proof); // Step 3',
    },
    userDecrypt: {
      term: 'User Decryption',
      definition: 'User decrypts with their private key. Only handles with FHE.allow() permission granted can be decrypted.',
      example: 'const value = await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);',
    },
    handleDeath: {
      term: 'Handle Death',
      definition: 'When decryption completes, the handle "dies" - its value is now public.',
      example: 'decryptedValue = clearValue; // Everyone can now see it',
    },
  },
};
