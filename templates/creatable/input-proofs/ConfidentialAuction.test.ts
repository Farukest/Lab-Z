/**
 * Confidential Auction - Input Proof Practical Example
 *
 * Bu test dosyası INPUT PROOF'un neden kritik olduğunu
 * GERÇEK bir senaryo üzerinden gösterir.
 *
 * SENARYO: Kapalı Zarf İhale
 * - Herkes şifreli teklif verir
 * - Kimse başkasının teklifini göremez
 * - INPUT PROOF sayesinde kimse başkasının teklifini KOPYALAYAMAZ
 */

import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ConfidentialAuction } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConfidentialAuction - Input Proof Example", function () {
  let auction: ConfidentialAuction;
  let auctionAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ConfidentialAuction");
    auction = await Factory.deploy();
    await auction.waitForDeployment();
    auctionAddress = await auction.getAddress();
  });

  // ═══════════════════════════════════════════════════════════════════
  //                         DOĞRU KULLANIM
  // ═══════════════════════════════════════════════════════════════════

  describe("Doğru Kullanım - Valid Input Proofs", function () {
    it("Alice teklif verebilir (proof ile)", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║              DOĞRU KULLANIM: Alice Teklif Veriyor          ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      const aliceBid = 100n;

      console.log("1. Alice 100₺ teklif hazırlıyor...");
      console.log("   → fhevm.createEncryptedInput(auctionAddress, alice.address)");
      console.log("   → Bu, Alice'e özel INPUT PROOF üretir\n");

      // Alice kendi adresi ve kontrat adresi ile şifreler
      // Bu proof sadece Alice tarafından, bu kontrata gönderilebilir
      const aliceInput = await fhevm
        .createEncryptedInput(auctionAddress, alice.address)
        .add64(aliceBid)
        .encrypt();

      console.log("2. Alice teklifi gönderiyor...");
      console.log("   → auction.bid(encryptedBid, inputProof)");
      console.log("   → FHE.fromExternal() proof'u doğrular\n");

      await expect(
        auction.connect(alice).bid(aliceInput.handles[0], aliceInput.inputProof)
      ).to.emit(auction, "BidPlaced").withArgs(alice.address);

      console.log("✅ Başarılı! Alice'in teklifi kabul edildi.");
      console.log("   → Proof geçerli: Alice şifreledi ✓");
      console.log("   → Proof geçerli: Bu kontrat için ✓\n");

      expect(await auction.hasBid(alice.address)).to.equal(true);
      expect(await auction.getBidderCount()).to.equal(1);
    });

    it("Birden fazla kişi teklif verebilir", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║              ÇOK KATILIMCI: Alice ve Bob Teklif Veriyor    ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      // Alice teklif verir
      const aliceInput = await fhevm
        .createEncryptedInput(auctionAddress, alice.address)
        .add64(100n)
        .encrypt();

      await auction.connect(alice).bid(aliceInput.handles[0], aliceInput.inputProof);
      console.log("✅ Alice teklif verdi (kendi proof'u ile)");

      // Bob teklif verir
      const bobInput = await fhevm
        .createEncryptedInput(auctionAddress, bob.address)
        .add64(150n)
        .encrypt();

      await auction.connect(bob).bid(bobInput.handles[0], bobInput.inputProof);
      console.log("✅ Bob teklif verdi (kendi proof'u ile)");

      console.log("\nHer kişi KENDİ proof'u ile teklif verdi.");
      console.log("Kimse başkasının teklifini kopyalayamaz!\n");

      expect(await auction.getBidderCount()).to.equal(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //                    SALDIRI SENARYOLARI (REVERT)
  // ═══════════════════════════════════════════════════════════════════

  describe("Saldırı Senaryoları - Input Proof Koruması", function () {
    it("❌ SALDIRI 1: Başkasının proof'unu kullanma", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║     SALDIRI 1: Bob, Alice'in Proof'unu Kullanmaya Çalışır  ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      console.log("SENARYO:");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("1. Alice 100₺ teklif hazırlar (encrypted + proof)");
      console.log("2. Bob, Alice'in encrypted değerini ve proof'unu KOPYALAR");
      console.log("3. Bob, kopyaladığı veriyle teklif vermeye çalışır");
      console.log("─────────────────────────────────────────────────────────────\n");

      // Alice kendi teklif verisini hazırlar
      const aliceInput = await fhevm
        .createEncryptedInput(auctionAddress, alice.address)
        .add64(100n)
        .encrypt();

      console.log("Alice'in verisi hazır:");
      console.log("  → handles[0]: 0x" + aliceInput.handles[0].toString().slice(0, 20) + "...");
      console.log("  → inputProof: 0x" + aliceInput.inputProof.toString().slice(0, 20) + "...\n");

      console.log("Bob bu veriyi kopyalayıp kendisi göndermeye çalışıyor...\n");

      // Bob, Alice'in verisini çalmaya çalışır
      // AMA proof Alice için üretilmiş, Bob için değil!
      await expect(
        auction.connect(bob).bid(aliceInput.handles[0], aliceInput.inputProof)
      ).to.be.reverted;

      console.log("❌ REVERT! Saldırı engellendi!");
      console.log("");
      console.log("NEDEN REVERT OLDU?");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("FHE.fromExternal() kontrol etti:");
      console.log("  → Proof kimin için üretilmiş? → Alice");
      console.log("  → msg.sender kim? → Bob");
      console.log("  → Alice ≠ Bob → REVERT!");
      console.log("─────────────────────────────────────────────────────────────\n");
    });

    it("❌ SALDIRI 2: Yanlış kontrat için üretilmiş proof", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║     SALDIRI 2: Başka Kontrat İçin Üretilmiş Proof          ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      console.log("SENARYO:");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("1. Alice, BAŞKA bir kontrat için encrypted veri hazırlar");
      console.log("2. Bu veriyi BU kontrata göndermeye çalışır");
      console.log("─────────────────────────────────────────────────────────────\n");

      // Rastgele bir adres (başka kontrat simülasyonu)
      const fakeContractAddress = "0x1234567890123456789012345678901234567890";

      // Alice yanlış kontrat adresi ile şifreler
      const wrongInput = await fhevm
        .createEncryptedInput(fakeContractAddress, alice.address)
        .add64(100n)
        .encrypt();

      console.log("Alice yanlış kontrat için proof üretti:");
      console.log("  → Proof için kontrat: 0x1234...7890");
      console.log("  → Gerçek kontrat: " + auctionAddress.slice(0, 10) + "...\n");

      // Bu proof bu kontrat için geçerli değil
      await expect(
        auction.connect(alice).bid(wrongInput.handles[0], wrongInput.inputProof)
      ).to.be.reverted;

      console.log("❌ REVERT! Saldırı engellendi!");
      console.log("");
      console.log("NEDEN REVERT OLDU?");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("FHE.fromExternal() kontrol etti:");
      console.log("  → Proof hangi kontrat için? → 0x1234...7890");
      console.log("  → Bu kontrat hangisi? → " + auctionAddress.slice(0, 10) + "...");
      console.log("  → Eşleşmiyor → REVERT!");
      console.log("─────────────────────────────────────────────────────────────\n");
    });

    it("❌ SALDIRI 3: Aynı proof ile iki kez teklif", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║     SALDIRI 3: Replay Attack - Aynı Teklifi Tekrar Kullanma ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      // Alice ilk teklifini verir
      const aliceInput = await fhevm
        .createEncryptedInput(auctionAddress, alice.address)
        .add64(100n)
        .encrypt();

      await auction.connect(alice).bid(aliceInput.handles[0], aliceInput.inputProof);
      console.log("✅ Alice ilk teklifini verdi\n");

      console.log("Alice aynı proof ile tekrar teklif vermeye çalışıyor...\n");

      // Aynı proof ile tekrar teklif vermeye çalışır
      // Bu sefer kontrat seviyesinde engellenir (hasBid kontrolü)
      await expect(
        auction.connect(alice).bid(aliceInput.handles[0], aliceInput.inputProof)
      ).to.be.revertedWithCustomError(auction, "AlreadyBid");

      console.log("❌ REVERT! AlreadyBid - Zaten teklif vermişsin!");
      console.log("");
      console.log("NOT: Bu kontrat seviyesinde engellendi.");
      console.log("Input proof olmasa bile replay attack'ler için");
      console.log("kontrat mantığı da önemlidir.\n");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //                         TAM AKIŞ TESTİ
  // ═══════════════════════════════════════════════════════════════════

  describe("Tam İhale Akışı", function () {
    it("Kapalı zarf ihale senaryosu", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║              TAM İHALE AKIŞI                               ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      // 1. Alice teklif verir
      console.log("1️⃣ Alice 100₺ teklif veriyor...");
      const aliceInput = await fhevm
        .createEncryptedInput(auctionAddress, alice.address)
        .add64(100n)
        .encrypt();
      await auction.connect(alice).bid(aliceInput.handles[0], aliceInput.inputProof);
      console.log("   ✅ Alice teklifi kabul edildi\n");

      // 2. Bob teklif verir
      console.log("2️⃣ Bob 150₺ teklif veriyor...");
      const bobInput = await fhevm
        .createEncryptedInput(auctionAddress, bob.address)
        .add64(150n)
        .encrypt();
      await auction.connect(bob).bid(bobInput.handles[0], bobInput.inputProof);
      console.log("   ✅ Bob teklifi kabul edildi\n");

      // 3. Saldırgan Alice'in teklifini çalmaya çalışır
      console.log("3️⃣ Attacker, Alice'in encrypted teklifini çalmaya çalışıyor...");
      await expect(
        auction.connect(attacker).bid(aliceInput.handles[0], aliceInput.inputProof)
      ).to.be.reverted;
      console.log("   ❌ REVERT! Input proof saldırıyı engelledi!\n");

      // 4. İhale biter
      console.log("4️⃣ İhale sona eriyor...");
      await auction.endAuction();
      console.log("   ✅ İhale bitti\n");

      // 5. Sonuçlar
      expect(await auction.auctionEnded()).to.equal(true);
      expect(await auction.getBidderCount()).to.equal(2);

      console.log("═══════════════════════════════════════════════════════════════");
      console.log("SONUÇ: Input proof sayesinde:");
      console.log("  ✓ Herkes sadece KENDİ teklifini verebildi");
      console.log("  ✓ Kimse başkasının teklifini KOPYALAYAMADI");
      console.log("  ✓ Tüm şifreli veriler GÜVENLİ bir şekilde işlendi");
      console.log("═══════════════════════════════════════════════════════════════\n");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //                         ÖZET
  // ═══════════════════════════════════════════════════════════════════

  describe("Özet", function () {
    it("Input Proof neden önemli?", async function () {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║                    INPUT PROOF ÖZETİ                       ║");
      console.log("╚═══════════════════════════════════════════════════════════╝\n");

      console.log("INPUT PROOF = 'Bu şifrelemeyi BEN yaptım' kanıtı\n");

      console.log("KORUMA SAĞLADIĞI SALDIRILAR:");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("  ✓ Başkasının encrypted değerini kopyalama");
      console.log("  ✓ Yanlış kontrata veri gönderme");
      console.log("  ✓ Bozuk/sahte ciphertext gönderme");
      console.log("  ✓ Replay attack (eski veriyi tekrar kullanma)\n");

      console.log("KULLANIM:");
      console.log("─────────────────────────────────────────────────────────────");
      console.log("  Client:");
      console.log("    const input = await fhevm");
      console.log("      .createEncryptedInput(contractAddress, userAddress)");
      console.log("      .add64(secretValue)");
      console.log("      .encrypt();\n");

      console.log("  Contract:");
      console.log("    euint64 value = FHE.fromExternal(input, proof);");
      console.log("    // Proof otomatik doğrulanır, geçersizse REVERT\n");
    });
  });
});
