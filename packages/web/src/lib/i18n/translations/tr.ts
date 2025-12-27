import type { Translations } from '../types';

/**
 * Turkish Translations
 */
export const tr: Translations = {
  // Common UI
  common: {
    back: 'geri',
    copyContract: 'kontratı kopyala',
    copied: 'kopyalandı',
    download: '.zip indir',
    loading: 'Yükleniyor...',
    notFound: 'Şablon bulunamadı',
    backToTemplates: 'şablonlara dön',
  },

  // Tutorial UI
  tutorial: {
    stepOf: 'Adım {current} / {total}',
    autoPlay: 'Otomatik Oynat',
    pause: 'Durdur',
    previous: 'Önceki',
    next: 'Sonraki',
    showFheOnly: 'Sadece FHE Adımları',
    showAllSteps: 'Tüm Adımlar',
    testPanel: 'TEST',
    contractPanel: 'KONTRAT',
    clientLabel: 'CLIENT',
    onChainLabel: 'ON-CHAIN',
    concept: 'Kavram',
    fheCall: 'FHE İşlemi',
    expand: '+Detay',
    collapse: '-Kapat',
    goToStep: "Adım'a git",
    ready: 'Hazır',
    startTutorial: 'Eğitimi Başlat',
    clickPlayToStart: 'Eğitimi başlatmak için Play butonuna basın veya yukarıdan bir adım seçin.',
    learnStepByStep: '{name} adım adım öğrenin.',
    play: 'Oynat',
  },

  // Handle Journey Tutorial
  handleJourney: {
    sections: {
      birth: {
        title: 'Doğum',
        description: 'Handle oluşturma',
      },
      permission: {
        title: 'İzin',
        description: 'ACL izinleri',
      },
      operation: {
        title: 'İşlem',
        description: 'FHE işlemleri',
      },
      storage: {
        title: 'Saklama',
        description: 'State saklama',
      },
      death: {
        title: 'Ölüm',
        description: 'Şifre çözme',
      },
    },

    steps: {
      // Stage 1: Birth
      deploy: {
        title: 'Kontrat Deploy',
        leftExplanation: 'Test: before() bloğunda kontrat deploy ediliyor.',
        rightExplanation: 'Kontrat: HandleJourney deploy edildi.',
      },
      callBirth: {
        title: 'Kontrata Çağrı',
        leftExplanation: 'Test: contract.stage1_birthFromPlaintext(secretValue) çağrılıyor.',
        rightExplanation: 'Kontrat: stage1_birthFromPlaintext(value) fonksiyonu çalışıyor.',
      },
      fheAsEuint64: {
        title: 'FHE.asEuint64() - Handle Doğuyor',
        rightExplanation: 'HANDLE DOĞUYOR! FHE.asEuint64(value) çağrıldı. Plaintext değer şifreleniyor.',
        fheDescription: 'Plaintext → Şifreli handle dönüşümü',
      },
      callBirthEncrypted: {
        title: 'Şifreli Input ile Doğum',
        leftExplanation: 'Test: Client-side şifreleme ile encrypted input gönderiliyor.',
        rightExplanation: 'Kontrat: FHE.fromExternal ile encrypted input handle\'a dönüşüyor.',
      },
      fheFromExternal: {
        title: 'FHE.fromExternal() - Input Doğrulama',
        rightExplanation: 'FHE.fromExternal(input, proof) - ZK kanıt doğrulanıyor, handle oluşuyor.',
        fheDescription: 'Harici şifreli input → dahili handle',
      },

      // Stage 2: Permission
      callGrantPerm: {
        title: 'Kalıcı İzin Çağrısı',
        leftExplanation: 'Test: contract.stage2_grantPermanentPermission() çağrılıyor.',
        rightExplanation: 'Kontrat: msg.sender adresine kalıcı izin verilecek.',
      },
      fheAllow: {
        title: 'FHE.allow() - Kalıcı İzin',
        rightExplanation: 'FHE.allow(storedHandle, msg.sender) - Çağıran artık bu handle\'ı kullanabilir.',
        fheDescription: 'Kalıcı izin - tüm işlemlerde geçerli',
      },
      callTransientPerm: {
        title: 'Geçici İzin Çağrısı',
        leftExplanation: 'Test: contract.stage2_grantTransientPermission(bob.address) çağrılıyor.',
        rightExplanation: 'Kontrat: FHE.allowTransient() ile geçici izin verilecek.',
      },
      fheAllowTransient: {
        title: 'FHE.allowTransient() - Geçici İzin',
        rightExplanation: 'FHE.allowTransient(storedHandle, to) - Sadece BU işlem içinde geçerli.',
        fheDescription: 'Geçici izin - işlem bitince sona erer',
      },

      // Stage 3: Operation
      callOpAdd: {
        title: 'Toplama İşlemi Çağrısı',
        leftExplanation: 'Test: contract.stage3_operationAdd() çağrılıyor.',
        rightExplanation: 'Kontrat: İki şifreli handle toplanacak.',
      },
      fheAdd: {
        title: 'FHE.add() - Yavru Handle Doğuyor',
        rightExplanation: 'YENİ HANDLE DOĞUYOR! FHE.add(storedHandle, secondHandle) = yeni yavru handle.',
        fheDescription: 'İki şifreli değeri topla, YENİ handle döndür',
      },
      callOpCompare: {
        title: 'Karşılaştırma İşlemi',
        leftExplanation: 'Test: contract.stage3_operationCompare() çağrılıyor.',
        rightExplanation: 'Kontrat: Handle\'lar karşılaştırılıyor, sonuç ebool.',
      },
      fheLt: {
        title: 'FHE.lt() - Şifreli Karşılaştırma',
        rightExplanation: 'FHE.lt(storedHandle, secondHandle) - Şifreli karşılaştırma, sonuç ebool.',
        fheDescription: 'Küçüktür karşılaştırması, ebool döner',
      },
      callOpSelect: {
        title: 'Seçim İşlemi',
        leftExplanation: 'Test: contract.stage3_operationSelect() çağrılıyor.',
        rightExplanation: 'Kontrat: Koşullu seçim - hangisi seçildiği GİZLİ kalır!',
      },
      fheSelect: {
        title: 'FHE.select() - Şifreli Ternary',
        rightExplanation: 'FHE.select(koşul, seçenekA, seçenekB) - Şifreli if/else, seçim gizli.',
        fheDescription: 'Şifreli ternary operatörü',
      },

      // Stage 4: Storage
      callStore: {
        title: 'Saklama Çağrısı',
        leftExplanation: 'Test: contract.stage4_storeOperationResult() çağrılıyor.',
        rightExplanation: 'Kontrat: İşlem sonucu storedHandle olarak kaydedilecek.',
      },
      storageAssign: {
        title: 'Handle Storage\'a Yazılıyor',
        rightExplanation: 'storedHandle = resultHandle - Handle artık kontrat state\'inde.',
      },
      callTransfer: {
        title: 'Handle Transfer',
        leftExplanation: 'Test: contract.stage4_transferHandle(bob.address) çağrılıyor.',
        rightExplanation: 'Kontrat: bob.address adresine handle transfer ediliyor.',
      },

      // Stage 5: Death
      callRequestDecrypt: {
        title: 'Adım 1: Şifre Çözme İsteği',
        leftExplanation: 'Test: contract.stage5_requestDecryption() çağrılıyor.',
        rightExplanation: 'Kontrat: 3 Adımlı Asenkron Şifre Çözme başlıyor.',
      },
      makePubliclyDecryptable: {
        title: 'FHE.makePubliclyDecryptable()',
        rightExplanation: 'FHE.makePubliclyDecryptable(storedHandle) - Handle off-chain şifre çözme için hazır.',
        fheDescription: 'Handle\'ı herkese açık şifre çözme için işaretler',
      },
      getHandleDecrypt: {
        title: 'Adım 2: Handle Al',
        leftExplanation: 'Test: Off-chain publicDecrypt() için handle alınıyor.',
        rightExplanation: 'Kontrat: euint64.unwrap(storedHandle) ile bytes32 döndürülüyor.',
      },
      finalizeDecrypt: {
        title: 'Adım 3: Şifre Çözmeyi Sonlandır',
        rightExplanation: 'FHE.checkSignatures() kanıtı doğruluyor. Handle "ölüyor".',
        fheDescription: 'Şifre çözme kanıt doğrulaması',
      },
    },
  },

  // FHE Concepts
  concepts: {
    handle: {
      term: 'Handle',
      definition: 'FHE işlemcisindeki şifreli veriye işaret eden 256-bit referans. Handle\'ın kendisi şifreli değeri içermez, sadece ona referans verir.',
      example: 'euint64 handle = FHE.asEuint64(42);',
    },
    encryptedInput: {
      term: 'Şifreli Input',
      definition: 'Client-side SDK ile şifrelenen kullanıcı girdisi. İki parçadan oluşur: handles[] (şifreli değerler) ve inputProof (ZK kanıt).',
      example: 'const encrypted = await fhevm.createEncryptedInput(contractAddr, userAddr).add64(42n).encrypt();',
    },
    fromExternal: {
      term: 'FHE.fromExternal()',
      definition: 'Harici şifreli input\'u (externalEuint64) dahili handle\'a (euint64) dönüştürür. Bu dönüşüm sırasında ZK kanıtı doğrulanır.',
      example: 'euint64 handle = FHE.fromExternal(externalInput, inputProof);',
    },
    allowThis: {
      term: 'FHE.allowThis()',
      definition: 'Kontratın kendisine bu handle\'ı kullanma izni verir. State\'e kaydetmek veya gelecek işlemlerde kullanmak için gerekli.',
      example: 'FHE.allowThis(handle);',
    },
    allow: {
      term: 'FHE.allow()',
      definition: 'Belirli bir adrese bu handle\'ı şifresini çözme veya kullanma izni verir. Kalıcı izin.',
      example: 'FHE.allow(handle, msg.sender);',
    },
    allowTransient: {
      term: 'FHE.allowTransient()',
      definition: 'Geçici izin - sadece bu işlem süresince geçerli. Kontratlar arası handle geçirmek için kullanılır.',
      example: 'FHE.allowTransient(handle, otherContract);',
    },
    add: {
      term: 'FHE.add()',
      definition: 'İki şifreli değeri toplar. Sonuç YENİ bir handle\'dır - orijinal handle\'lar değişmez.',
      example: 'euint64 toplam = FHE.add(a, b);',
    },
    lt: {
      term: 'FHE.lt()',
      definition: 'İki şifreli değeri karşılaştırır (küçüktür). Sonuç ebool handle\'dır - hangisinin büyük olduğu gizli kalır.',
      example: 'ebool kucukMu = FHE.lt(a, b); // a < b ?',
    },
    select: {
      term: 'FHE.select()',
      definition: 'Şifreli ternary operatörü. Koşul ebool, her iki seçenek de şifreli. Hangisinin seçildiği gizli kalır - dallanma sızıntısı olmaz.',
      example: 'euint64 sonuc = FHE.select(kosul, dogruysa, yanlissa);',
    },
    makePubliclyDecryptable: {
      term: 'FHE.makePubliclyDecryptable()',
      definition: '3 Adımlı Asenkron Şifre Çözme\'nin 1. adımı. Handle\'ı off-chain şifre çözme için işaretler. Sonra SDK ile publicDecrypt() çağrılır.',
      example: 'FHE.makePubliclyDecryptable(handle); // Adım 1',
    },
    checkSignatures: {
      term: 'FHE.checkSignatures()',
      definition: '3 Adımlı Asenkron Şifre Çözme\'nin 3. adımı. Off-chain şifre çözme sonucunu ve kanıtı doğrular. Başarılı olursa değer artık herkese açık.',
      example: 'FHE.checkSignatures(handles, cleartexts, proof); // Adım 3',
    },
    userDecrypt: {
      term: 'Kullanıcı Şifre Çözme',
      definition: 'Kullanıcı kendi özel anahtarı ile şifresini çözer. Sadece FHE.allow() ile izin verilmiş handle\'ların şifresi çözülebilir.',
      example: 'const deger = await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, signer);',
    },
    handleDeath: {
      term: 'Handle Ölümü',
      definition: 'Şifre çözme tamamlandığında handle "ölür" - değeri artık herkese açık.',
      example: 'sifresiCozulenDeger = acikDeger; // Artık herkes görebilir',
    },
  },
};
