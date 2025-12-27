/**
 * i18n Type Definitions
 *
 * Supported languages and translation structure
 */

export type Language = 'en' | 'tr';

export const LANGUAGES: Record<Language, { name: string; nativeName: string; code: string }> = {
  en: { name: 'English', nativeName: 'English', code: 'EN' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', code: 'TR' },
};

export const DEFAULT_LANGUAGE: Language = 'en';

// Translation keys structure
export interface Translations {
  // Common UI
  common: {
    back: string;
    copyContract: string;
    copied: string;
    download: string;
    loading: string;
    notFound: string;
    backToTemplates: string;
  };

  // Tutorial UI
  tutorial: {
    stepOf: string; // "Step {current} of {total}"
    autoPlay: string;
    pause: string;
    previous: string;
    next: string;
    showFheOnly: string;
    showAllSteps: string;
    testPanel: string;
    contractPanel: string;
    clientLabel: string;
    onChainLabel: string;
    concept: string;
    fheCall: string;
    expand: string;
    collapse: string;
    goToStep: string;
    ready: string;
    startTutorial: string;
    clickPlayToStart: string;
    learnStepByStep: string; // "Learn {name} step by step."
    play: string;
  };

  // Handle Journey Tutorial
  handleJourney: {
    // Section titles
    sections: {
      birth: { title: string; description: string };
      permission: { title: string; description: string };
      operation: { title: string; description: string };
      storage: { title: string; description: string };
      death: { title: string; description: string };
    };

    // Step explanations
    steps: {
      // Stage 1: Birth
      deploy: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      callBirth: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheAsEuint64: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
      callBirthEncrypted: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheFromExternal: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };

      // Stage 2: Permission
      callGrantPerm: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheAllow: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
      callTransientPerm: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheAllowTransient: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };

      // Stage 3: Operation
      callOpAdd: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheAdd: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
      callOpCompare: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheLt: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
      callOpSelect: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      fheSelect: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };

      // Stage 4: Storage
      callStore: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      storageAssign: {
        title: string;
        rightExplanation: string;
      };
      callTransfer: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };

      // Stage 5: Death
      callRequestDecrypt: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      makePubliclyDecryptable: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
      getHandleDecrypt: {
        title: string;
        leftExplanation: string;
        rightExplanation: string;
      };
      finalizeDecrypt: {
        title: string;
        rightExplanation: string;
        fheDescription: string;
      };
    };
  };

  // FHE Concepts
  concepts: {
    handle: { term: string; definition: string; example: string };
    encryptedInput: { term: string; definition: string; example: string };
    fromExternal: { term: string; definition: string; example: string };
    allowThis: { term: string; definition: string; example: string };
    allow: { term: string; definition: string; example: string };
    allowTransient: { term: string; definition: string; example: string };
    add: { term: string; definition: string; example: string };
    lt: { term: string; definition: string; example: string };
    select: { term: string; definition: string; example: string };
    makePubliclyDecryptable: { term: string; definition: string; example: string };
    checkSignatures: { term: string; definition: string; example: string };
    userDecrypt: { term: string; definition: string; example: string };
    handleDeath: { term: string; definition: string; example: string };
  };
}
