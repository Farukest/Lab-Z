// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Confidential Auction - Input Proof Example
/// @notice Sealed bid auction demonstrating WHY input proofs are critical
/// @dev This is a PRACTICAL example of input proof usage
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    SENARYO: KAPALI ZARF İHALE                      ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║   1. Alice 100₺ teklif verir (şifreli)                            ║
/// ║   2. Bob 80₺ teklif verir (şifreli)                               ║
/// ║   3. İhale biter, en yüksek teklif kazanır                        ║
/// ║                                                                    ║
/// ║   SALDIRI (Input Proof olmasaydı):                                ║
/// ║   ─────────────────────────────────                               ║
/// ║   Bob, Alice'in şifreli teklifini blockchain'den kopyalar         ║
/// ║   "Bu benim teklifimdi" der                                       ║
/// ║   Sistem kimin gerçek sahip olduğunu bilemez!                     ║
/// ║                                                                    ║
/// ║   INPUT PROOF İLE:                                                ║
/// ║   ─────────────────────────────────                               ║
/// ║   Her teklif, "BU ŞİFRELEMEYİ BEN YAPTIM" kanıtı içerir          ║
/// ║   Bob kopyalasa bile → REVERT (proof Alice'e ait)                 ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
contract ConfidentialAuction is ZamaEthereumConfig {
    // ============ State ============

    address public owner;
    bool public auctionEnded;

    // Her kullanıcının şifreli teklifi
    mapping(address => euint64) private _bids;
    mapping(address => bool) public hasBid;

    // En yüksek teklif (şifreli)
    euint64 private _highestBid;
    address public highestBidder;

    // Katılımcı listesi
    address[] public bidders;

    // ============ Events ============

    event BidPlaced(address indexed bidder);
    event AuctionEnded(address indexed winner);

    // ============ Errors ============

    error AuctionAlreadyEnded();
    error AuctionNotEnded();
    error AlreadyBid();
    error NoBidders();

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
        // Initialize highest bid to 0
        _highestBid = FHE.asEuint64(0);
        FHE.allowThis(_highestBid);
    }

    // ============ Core Functions ============

    /// @notice Teklif ver - INPUT PROOF BURADA DEVREYE GİRİYOR
    /// @param encryptedBid Şifreli teklif miktarı
    /// @param inputProof ZK kanıtı: "Bu şifrelemeyi BEN yaptım"
    ///
    /// ╔═══════════════════════════════════════════════════════════════╗
    /// ║  FHE.fromExternal() şunları kontrol eder:                     ║
    /// ║                                                                ║
    /// ║  1. Bu şifreleme msg.sender tarafından mı yapıldı?            ║
    /// ║     → Hayır ise REVERT (başkasının teklifini kopyalayamazsın) ║
    /// ║                                                                ║
    /// ║  2. Bu şifreleme BU KONTRAT için mi yapıldı?                  ║
    /// ║     → Hayır ise REVERT (başka kontratın verisini kullanamazsın)║
    /// ║                                                                ║
    /// ║  3. Şifreleme doğru mu yapılmış?                              ║
    /// ║     → Hayır ise REVERT (bozuk veri gönderemezsin)             ║
    /// ╚═══════════════════════════════════════════════════════════════╝
    function bid(
        externalEuint64 encryptedBid,
        bytes calldata inputProof
    ) external {
        if (auctionEnded) revert AuctionAlreadyEnded();
        if (hasBid[msg.sender]) revert AlreadyBid();

        // ⚡ INPUT PROOF DOĞRULAMASI BURADA OLUYOR ⚡
        // fromExternal() proof'u kontrol eder:
        // - Geçersiz proof → REVERT
        // - Başkasının proof'u → REVERT
        // - Yanlış kontrat için proof → REVERT
        euint64 bidAmount = FHE.fromExternal(encryptedBid, inputProof);

        // Teklifi kaydet
        _bids[msg.sender] = bidAmount;
        hasBid[msg.sender] = true;
        bidders.push(msg.sender);

        // ACL izinleri
        FHE.allowThis(_bids[msg.sender]);
        FHE.allow(_bids[msg.sender], msg.sender);

        // En yüksek teklifi güncelle
        ebool isHigher = FHE.gt(bidAmount, _highestBid);
        _highestBid = FHE.select(isHigher, bidAmount, _highestBid);
        FHE.allowThis(_highestBid);

        emit BidPlaced(msg.sender);
    }

    /// @notice İhaleyi bitir ve kazananı belirle
    function endAuction() external {
        if (auctionEnded) revert AuctionAlreadyEnded();
        if (bidders.length == 0) revert NoBidders();

        auctionEnded = true;

        // En yüksek teklifi veren kişiyi bul
        // (Basitlik için ilk eşleşeni alıyoruz)
        for (uint256 i = 0; i < bidders.length; i++) {
            ebool isWinner = FHE.eq(_bids[bidders[i]], _highestBid);
            // Not: Gerçek uygulamada decrypt ile kontrol edilir
            // Bu örnek için basit tutuyoruz
            FHE.allowThis(isWinner);
        }

        // İlk bidder'ı geçici kazanan olarak ata (demo için)
        highestBidder = bidders[0];

        emit AuctionEnded(highestBidder);
    }

    // ============ View Functions ============

    /// @notice Kullanıcının kendi teklifini görmesi (şifreli handle)
    function getMyBid() external view returns (euint64) {
        return _bids[msg.sender];
    }

    /// @notice En yüksek teklif (şifreli handle)
    function getHighestBid() external view returns (euint64) {
        return _highestBid;
    }

    /// @notice Toplam katılımcı sayısı
    function getBidderCount() external view returns (uint256) {
        return bidders.length;
    }
}
