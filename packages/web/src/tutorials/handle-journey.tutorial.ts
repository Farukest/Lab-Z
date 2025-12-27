import { Tutorial, FHE_CONCEPTS } from './types';

/**
 * Handle Journey Tutorial
 *
 * Bu tutorial, FHE handle'ların yaşam döngüsünü adım adım gösterir:
 * BIRTH → PERMISSION → OPERATION → STORAGE → DEATH
 *
 * DYNAMIC LINE DETECTION:
 * - Artik manuel line number YOK
 * - method: Fonksiyon adi ile otomatik bulunur
 * - fheOp: FHE.xxx cagrilari otomatik bulunur
 * - pattern: Regex ile ozel satirlar bulunur
 */
export const handleJourneyTutorial: Tutorial = {
  templateId: 'handle-journey',
  title: 'Handle Lifecycle Tutorial',
  description: 'FHE handle\'ların doğumdan ölüme (decryption) kadar tüm yaşam döngüsü',

  modes: {
    lineByLine: true,
    fheStepsOnly: true,
  },

  sections: [
    // =========================================================================
    //                    SECTION: Stage 1 - Birth
    // =========================================================================
    {
      id: 'stage1-birth',
      title: 'Stage 1: Birth - Handle Creation',
      steps: [
        // --- Deploy ---
        {
          id: 'deploy',
          title: 'Contract Deploy',
          test: { method: 'deployFixture' },
          contract: { pattern: 'contract HandleJourney' },
          leftExplanation: 'Test: deployFixture() ile contract deploy ediliyor.',
          rightExplanation: 'Contract: HandleJourney deploy edildi.',
          flow: 'test-to-contract',
          duration: 3000,
        },

        // --- Call birthFromPlaintext ---
        {
          id: 'call-birth',
          title: 'Contract\'a Çağrı',
          test: { block: 'should create handle from plaintext', call: 'stage1_birthFromPlaintext' },
          contract: { method: 'stage1_birthFromPlaintext' },
          leftExplanation: 'Test: contract.stage1_birthFromPlaintext(secretValue) çağrılıyor.',
          rightExplanation: 'Contract: stage1_birthFromPlaintext(value) fonksiyonu çalışıyor.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.asEuint64 - HANDLE BIRTH ---
        {
          id: 'fhe-as-euint64',
          title: 'FHE.asEuint64() - Handle Doğuyor',
          contract: { fheOp: 'asEuint64' },
          rightExplanation: 'HANDLE DOĞUYOR! FHE.asEuint64(value) çağrıldı. Plaintext değer şifreleniyor.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.asEuint64',
            description: 'Plaintext → Encrypted handle dönüşümü'
          },
          concept: FHE_CONCEPTS.HANDLE,
          duration: 4000,
        },

      ],
    },

    // =========================================================================
    //                    SECTION: Stage 2 - Permission
    // =========================================================================
    {
      id: 'stage2-permission',
      title: 'Stage 2: Permission - Access Control',
      steps: [
        // --- Permanent Permission ---
        {
          id: 'call-grant-perm',
          title: 'Permanent Permission Çağrısı',
          test: { block: 'should grant permanent permission to another address', call: 'stage2_grantPermanentPermission' },
          contract: { method: 'stage2_grantPermanentPermission' },
          leftExplanation: 'Test: contract.stage2_grantPermanentPermission() çağrılıyor.',
          rightExplanation: 'Contract: msg.sender adresine kalıcı permission verilecek.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.allow ---
        {
          id: 'fhe-allow',
          title: 'FHE.allow() - Kalıcı Permission',
          contract: { pattern: 'FHE\\.allow\\(storedHandle' },
          rightExplanation: 'FHE.allow(storedHandle, msg.sender) - Caller artık bu handle\'ı kullanabilir.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allow',
            description: 'Kalıcı permission - tüm transaction\'larda geçerli'
          },
          concept: FHE_CONCEPTS.ALLOW,
          duration: 3500,
        },

        // --- Transient Permission ---
        {
          id: 'call-transient-perm',
          title: 'Transient Permission Çağrısı',
          test: { block: 'should grant transient permission', call: 'stage2_grantTransientPermission' },
          contract: { method: 'stage2_grantTransientPermission' },
          leftExplanation: 'Test: contract.stage2_grantTransientPermission(bob.address) çağrılıyor.',
          rightExplanation: 'Contract: FHE.allowTransient() ile geçici permission verilecek.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.allowTransient ---
        {
          id: 'fhe-allow-transient',
          title: 'FHE.allowTransient() - Geçici Permission',
          contract: { fheOp: 'allowTransient' },
          rightExplanation: 'FHE.allowTransient(storedHandle, to) - Sadece BU transaction içinde geçerli.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.allowTransient',
            description: 'Geçici permission - transaction bitince yok olur'
          },
          concept: FHE_CONCEPTS.ALLOW_TRANSIENT,
          duration: 3500,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Stage 3 - Operation
    // =========================================================================
    {
      id: 'stage3-operation',
      title: 'Stage 3: Operation - FHE Operations',
      steps: [
        // --- Add Operation ---
        {
          id: 'call-op-add',
          title: 'Add Operation Çağrısı',
          test: { block: 'should create child handle from add operation', call: 'stage3_operationAdd' },
          contract: { method: 'stage3_operationAdd' },
          leftExplanation: 'Test: contract.stage3_operationAdd() çağrılıyor.',
          rightExplanation: 'Contract: İki encrypted handle toplanacak.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.add ---
        {
          id: 'fhe-add',
          title: 'FHE.add() - Child Handle Doğuyor',
          contract: { fheOp: 'add' },
          rightExplanation: 'YENİ HANDLE DOĞUYOR! FHE.add(storedHandle, secondHandle) = yeni child handle.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.add',
            description: 'İki encrypted değeri topla, YENİ handle döndür'
          },
          concept: FHE_CONCEPTS.ADD,
          duration: 4000,
        },

        // --- Compare ---
        {
          id: 'call-op-compare',
          title: 'Compare Operation',
          test: { block: 'should create ebool handle from comparison', call: 'stage3_operationCompare' },
          contract: { method: 'stage3_operationCompare' },
          leftExplanation: 'Test: contract.stage3_operationCompare() çağrılıyor.',
          rightExplanation: 'Contract: Handle\'lar karşılaştırılıyor, sonuç ebool.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.gt ---
        {
          id: 'fhe-gt',
          title: 'FHE.gt() - Encrypted Compare',
          contract: { fheOp: 'gt' },
          rightExplanation: 'FHE.gt(_trackedHandle, compareHandle) - Şifreli karşılaştırma, sonuç ebool.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.gt',
            description: 'Greater than comparison, returns ebool'
          },
          concept: FHE_CONCEPTS.GT,
          duration: 3500,
        },

      ],
    },

    // =========================================================================
    //                    SECTION: Stage 4 - Storage
    // =========================================================================
    {
      id: 'stage4-storage',
      title: 'Stage 4: Storage - Persistence',
      steps: [
        // --- Store operation result ---
        {
          id: 'call-store',
          title: 'Storage Çağrısı',
          test: { block: 'should store operation result as tracked handle', call: 'stage4_storeOperationResult' },
          contract: { method: 'stage4_storeOperationResult' },
          leftExplanation: 'Test: contract.stage4_storeOperationResult() çağrılıyor.',
          rightExplanation: 'Contract: Operation sonucu storedHandle olarak saklanacak.',
          flow: 'test-to-contract',
          duration: 3000,
        },
      ],
    },

    // =========================================================================
    //                    SECTION: Stage 5 - Death (Decryption)
    // =========================================================================
    {
      id: 'stage5-death',
      title: 'Stage 5: Death - Decryption (3-Step Async)',
      steps: [
        // --- Request decryption (Step 1) ---
        {
          id: 'call-request-decrypt',
          title: 'Step 1: Decryption Request',
          test: { block: 'should request decryption', call: 'stage5_requestDecryption' },
          contract: { method: 'stage5_requestDecryption' },
          leftExplanation: 'Test: contract.stage5_requestDecryption() çağrılıyor.',
          rightExplanation: 'Contract: 3-Step Async Decryption başlıyor.',
          flow: 'test-to-contract',
          duration: 2500,
        },

        // --- FHE.makePubliclyDecryptable ---
        {
          id: 'make-publicly-decryptable',
          title: 'FHE.makePubliclyDecryptable()',
          contract: { fheOp: 'makePubliclyDecryptable' },
          rightExplanation: 'FHE.makePubliclyDecryptable(storedHandle) - Handle off-chain decrypt için hazır.',
          flow: 'contract-only',
          fheCall: {
            name: 'FHE.makePubliclyDecryptable',
            description: 'Handle\'i public decrypt icin isaretler'
          },
          concept: FHE_CONCEPTS.MAKE_PUBLICLY_DECRYPTABLE,
          duration: 3500,
        },
      ],
    },
  ],
};
