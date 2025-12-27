/**
 * Tutorial Step Types
 *
 * Her adım test ve/veya contract tarafında highlight yapılacak satırları,
 * açıklamaları ve FHE call bilgilerini içerir.
 *
 * DYNAMIC LINE DETECTION:
 * - lines: Manual line numbers (eski sistem, deprecated)
 * - method: Otomatik olarak function'i bul
 * - pattern: Regex ile satir bul
 * - fheOp: FHE.xxx cagrisini bul
 * - block + call: Test bloğu içinde fonksiyon çağrısı bul (en iyi yöntem)
 */

export interface TutorialCodeRef {
  /** Satır aralığı [başlangıç, bitiş] (1-indexed) - DEPRECATED: Use method instead */
  lines?: [number, number];
  /** Fonksiyon/metod adı - otomatik line detection */
  method?: string;
  /** Regex pattern ile satir bul */
  pattern?: string;
  /** FHE operasyonu bul (ornek: 'add' -> FHE.add satiri) */
  fheOp?: string;
  /** Test bloğu ismi - it() veya describe() açıklaması (sadece test için) */
  block?: string;
  /** Fonksiyon çağrısı adı - block içinde aranır (block ile birlikte kullanılır) */
  call?: string;
}

export interface TutorialFHECall {
  /** FHE operasyonu adı: FHE.fromExternal, FHE.add, etc. */
  name: string;
  /** Contract'ta hangi satırda - opsiyonel, otomatik bulunabilir */
  line?: number;
  /** Kısa açıklama */
  description?: string;
}

export interface TutorialStep {
  /** Unique step ID */
  id: string;

  /** Step başlığı */
  title: string;

  /** Test tarafı (sol panel) */
  test?: TutorialCodeRef;

  /** Contract tarafı (sağ panel) */
  contract?: TutorialCodeRef;

  /** Sol panel açıklaması (test için) */
  leftExplanation?: string;

  /** Sağ panel açıklaması (contract için) */
  rightExplanation?: string;

  /** Bu adımda çağrılan FHE operasyonu */
  fheCall?: TutorialFHECall;

  /** Akış yönü gösterimi */
  flow?: 'test-to-contract' | 'contract-to-test' | 'test-only' | 'contract-only';

  /** Kavram açıklaması (concept box) */
  concept?: {
    term: string;
    definition: string;
    example?: string;
  };

  /** Auto-play duration (ms) */
  duration?: number;
}

export interface TutorialSection {
  /** Section ID (genellikle describe bloğu) */
  id: string;

  /** Section başlığı */
  title: string;

  /** Bu section'daki adımlar */
  steps: TutorialStep[];
}

export interface Tutorial {
  /** Template ID ile eşleşmeli */
  templateId: string;

  /** Tutorial başlığı */
  title: string;

  /** Kısa açıklama */
  description: string;

  /** Tutorial modları */
  modes: {
    /** Satır satır detaylı mod */
    lineByLine: boolean;
    /** Sadece FHE çağrıları modu */
    fheStepsOnly: boolean;
  };

  /** Tutorial bölümleri (her describe bloğu bir section) */
  sections: TutorialSection[];
}

// FHE Concepts - Ortak kavram tanımları
export const FHE_CONCEPTS = {
  HANDLE: {
    term: 'Handle',
    definition: 'FHE coprocessor\'daki encrypted data\'ya işaret eden 256-bit referans. Handle\'ın kendisi şifreli değeri içermez, sadece ona referans verir.',
    example: 'euint64 handle = FHE.asEuint64(42);'
  },
  ENCRYPTED_INPUT: {
    term: 'Encrypted Input',
    definition: 'Client-side SDK ile şifrelenen kullanıcı girdisi. İki parçadan oluşur: handles[] (şifreli değerler) ve inputProof (ZK kanıt).',
    example: 'const encrypted = await fhevm.createEncryptedInput(contractAddr, userAddr).add64(42n).encrypt();'
  },
  FROM_EXTERNAL: {
    term: 'FHE.fromExternal()',
    definition: 'External encrypted input\'u (externalEuint64) internal handle\'a (euint64) dönüştürür. Bu dönüşüm sırasında ZK proof doğrulanır.',
    example: 'euint64 handle = FHE.fromExternal(externalInput, inputProof);'
  },
  ALLOW_THIS: {
    term: 'FHE.allowThis()',
    definition: 'Contract\'ın kendisine bu handle\'ı kullanma izni verir. Storage\'a kaydetmek veya gelecek transaction\'larda kullanmak için gerekli.',
    example: 'FHE.allowThis(handle);'
  },
  ALLOW: {
    term: 'FHE.allow()',
    definition: 'Belirli bir adrese bu handle\'ı decrypt etme veya kullanma izni verir. Kalıcı permission.',
    example: 'FHE.allow(handle, msg.sender);'
  },
  ALLOW_TRANSIENT: {
    term: 'FHE.allowTransient()',
    definition: 'Geçici permission - sadece bu transaction süresince geçerli. Contract\'lar arası handle geçirme için kullanılır.',
    example: 'FHE.allowTransient(handle, otherContract);'
  },
  ADD: {
    term: 'FHE.add()',
    definition: 'İki encrypted değeri toplar. Sonuç YENİ bir handle\'dır - orijinal handle\'lar değişmez.',
    example: 'euint64 sum = FHE.add(a, b);'
  },
  LT: {
    term: 'FHE.lt()',
    definition: 'İki encrypted değeri karşılaştırır (less than). Sonuç ebool handle\'dır - hangisinin büyük olduğu gizli kalır.',
    example: 'ebool isLess = FHE.lt(a, b); // a < b ?'
  },
  GT: {
    term: 'FHE.gt()',
    definition: 'İki encrypted değeri karşılaştırır (greater than). Sonuç ebool handle\'dır - hangisinin büyük olduğu gizli kalır.',
    example: 'ebool isGreater = FHE.gt(a, b); // a > b ?'
  },
  SELECT: {
    term: 'FHE.select()',
    definition: 'Encrypted ternary operator. Koşul ebool, her iki seçenek de encrypted. Hangisinin seçildiği gizli kalır - branching leak olmaz.',
    example: 'euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);'
  },
  MAKE_PUBLICLY_DECRYPTABLE: {
    term: 'FHE.makePubliclyDecryptable()',
    definition: '3-Step Async Decryption\'ın 1. adımı. Handle\'ı off-chain decrypt için işaretler. Sonra SDK ile publicDecrypt() çağrılır.',
    example: 'FHE.makePubliclyDecryptable(handle); // Step 1'
  },
  CHECK_SIGNATURES: {
    term: 'FHE.checkSignatures()',
    definition: '3-Step Async Decryption\'ın 3. adımı. Off-chain decrypt sonucunu ve proof\'u doğrular. Başarılı olursa değer artık public.',
    example: 'FHE.checkSignatures(handles, cleartexts, proof); // Step 3'
  },
  USER_DECRYPT: {
    term: 'User Decryption',
    definition: 'Kullanıcı kendi private key\'i ile decrypt eder. Sadece FHE.allow() ile izin verilmiş handle\'lar decrypt edilebilir.',
    example: 'const value = await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);'
  },
} as const;
