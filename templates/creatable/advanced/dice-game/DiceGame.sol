// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title DiceGame
 * @notice Provably fair dice game with encrypted rolls
 * @dev Uses FHE.random() for fair dice generation
 *
 * Game Types:
 * - Over/Under: Bet on dice total being over or under a threshold
 * - Exact: Bet on exact dice sum
 * - High/Low: Bet on high (4-6) or low (1-3)
 *
 * FHE Operations Used:
 * - random: Generate unpredictable dice rolls
 * - rem: Map random to 1-6 range
 * - add: Sum multiple dice
 * - mul: Calculate payouts
 * - gt/lt/eq: Compare against bet predictions
 * - select: Determine win/loss
 */
contract DiceGame is ZamaEthereumConfig {
    // ============ Errors ============
    error InsufficientBet();
    error GameNotFound();
    error GameAlreadyRevealed();
    error GameNotRevealed();
    error NotGamePlayer();
    error InsufficientHouseFunds();
    error AlreadyClaimed();
    error InvalidDecryptionProof();
    

    // ============ Events ============
    event BetPlaced(uint256 indexed gameId, address indexed player, uint256 amount);
    event DiceRolled(uint256 indexed gameId);
    event ResultReadyForReveal(uint256 indexed gameId);
    event ResultRevealed(uint256 indexed gameId, address indexed player, bool won);
    event WinningsClaimed(uint256 indexed gameId, address indexed player, uint256 amount);
    

    // ============ Enums ============
    enum BetType { OverUnder, Exact, HighLow }

    // ============ Structs ============
    struct Game {
        address player;
        BetType betType;
        uint8 prediction;                // What player predicted
        uint256 betAmount;
        euint64 dice1;             // Encrypted first die
        euint64 dice2;             // Encrypted second die (optional)
        euint64 total;             // Encrypted sum
        ebool won;                       // Encrypted win status
        bool revealRequested;            // Has reveal been requested
        bool revealed;                   // Has result been revealed
        bool revealedWon;                // Decrypted win status
        bool claimed;                    // Has payout been claimed
        uint256 payout;
    }

    // ============ State Variables ============
    mapping(uint256 => Game) public _games;
    uint256 public _gameCount;

    uint256 public minBet;
    uint256 public maxBet;
    uint256 public houseEdge;            // In basis points (100 = 1%)

    // Payout multipliers (in basis points, 10000 = 1x)
    uint256 public constant OVER_UNDER_PAYOUT = 19500;  // 1.95x
    uint256 public constant EXACT_PAYOUT = 50000;        // 5x
    uint256 public constant HIGH_LOW_PAYOUT = 19000;     // 1.9x
    

    // ============ Modifiers ============
    modifier gameExists(uint256 gameId) {
        if (gameId >= _gameCount) revert GameNotFound();
        _;
    }

    modifier isPlayer(uint256 gameId) {
        if (_games[gameId].player != msg.sender) revert NotGamePlayer();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _minBet, uint256 _maxBet, uint256 _houseEdge) {
        minBet = _minBet;
        maxBet = _maxBet;
        houseEdge = _houseEdge;
        
    }

    // ============ External Functions ============

    /**
     * @notice Place a bet and roll dice
     * @param betType Type of bet (OverUnder, Exact, HighLow)
     * @param prediction Your prediction (threshold for OverUnder, exact sum for Exact, 0=low/1=high for HighLow)
     */
    function placeBet(BetType betType, uint8 prediction) external payable returns (uint256) {
        if (msg.value < minBet) revert InsufficientBet();
        if (msg.value > maxBet) revert InsufficientBet();

        uint256 gameId = _gameCount++;

        // Generate encrypted dice using FHE.random
        euint64 rand1 = FHE.randEuint64();
        euint64 rand2 = FHE.randEuint64();

        // Map to 1-6 range: (random % 6) + 1
        euint64 dice1 = FHE.add(FHE.rem(rand1, uint64(6)), FHE.asEuint64(1));
        euint64 dice2 = FHE.add(FHE.rem(rand2, uint64(6)), FHE.asEuint64(1));

        // Calculate total
        euint64 total = FHE.add(dice1, dice2);

        // Determine win based on bet type
        ebool won;
        if (betType == BetType.OverUnder) {
            // Win if total > prediction
            won = FHE.gt(total, FHE.asEuint8(prediction));
        } else if (betType == BetType.Exact) {
            // Win if total == prediction
            won = FHE.eq(total, FHE.asEuint8(prediction));
        } else {
            // HighLow: prediction 0 = low (2-6), prediction 1 = high (8-12)
            if (prediction == 0) {
                won = FHE.le(total, FHE.asEuint8(6));
            } else {
                won = FHE.ge(total, FHE.asEuint8(8));
            }
        }

        _games[gameId] = Game({
            player: msg.sender,
            betType: betType,
            prediction: prediction,
            betAmount: msg.value,
            dice1: dice1,
            dice2: dice2,
            total: total,
            won: won,
            revealRequested: false,
            revealed: false,
            revealedWon: false,
            claimed: false,
            payout: 0
        });

        // Allow contract to use encrypted values
        FHE.allowThis(dice1);
        FHE.allowThis(dice2);
        FHE.allowThis(total);
        FHE.allowThis(won);

        emit BetPlaced(gameId, msg.sender, msg.value);
        emit DiceRolled(gameId);

        return gameId;
    }

    /**
     * @notice Request result reveal via public decryption
     * @dev Step 1 of 3-step async public decryption pattern
     * @param gameId The game to reveal
     */
    function requestResultReveal(uint256 gameId)
        external
        gameExists(gameId)
        isPlayer(gameId)
    {
        Game storage game = _games[gameId];
        if (game.revealRequested) revert GameAlreadyRevealed();

        game.revealRequested = true;

        // Mark win status for public decryption
        FHE.makePubliclyDecryptable(game.won);

        emit ResultReadyForReveal(gameId);
    }

    /**
     * @notice Get encrypted win status handle for off-chain decryption
     * @dev Step 2 is off-chain: use relayer-sdk to decrypt
     * @param gameId The game to get handle for
     */
    function getWinHandle(uint256 gameId)
        external
        view
        gameExists(gameId)
        returns (ebool)
    {
        return _games[gameId].won;
    }

    /**
     * @notice Finalize result reveal with decryption proof
     * @dev Step 3 of 3-step async public decryption pattern
     * @param gameId The game to finalize
     * @param wonResult The decrypted win status
     * @param decryptionProof The proof from Zama KMS
     */
    function finalizeResultReveal(
        uint256 gameId,
        bool wonResult,
        bytes calldata decryptionProof
    )
        external
        gameExists(gameId)
    {
        Game storage game = _games[gameId];
        if (!game.revealRequested) revert GameNotRevealed();
        if (game.revealed) revert GameAlreadyRevealed();

        // Verify the decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(game.won);

        bytes memory cleartexts = abi.encode(wonResult);

        // This reverts if proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store revealed result
        game.revealed = true;
        game.revealedWon = wonResult;

        // Calculate payout if won
        if (wonResult) {
            uint256 multiplier;
            if (game.betType == BetType.OverUnder) {
                multiplier = OVER_UNDER_PAYOUT;
            } else if (game.betType == BetType.Exact) {
                multiplier = EXACT_PAYOUT;
            } else {
                multiplier = HIGH_LOW_PAYOUT;
            }
            game.payout = (game.betAmount * multiplier) / 10000;
        }

        emit ResultRevealed(gameId, game.player, wonResult);
    }

    /**
     * @notice Claim winnings after reveal
     * @param gameId The game to claim
     */
    function claimWinnings(uint256 gameId)
        external
        gameExists(gameId)
        isPlayer(gameId)
    {
        Game storage game = _games[gameId];
        if (!game.revealed) revert GameNotRevealed();
        if (game.claimed) revert AlreadyClaimed();

        game.claimed = true;

        if (game.revealedWon && game.payout > 0) {
            if (address(this).balance < game.payout) revert InsufficientHouseFunds();

            (bool success, ) = payable(msg.sender).call{value: game.payout}("");
            require(success, "Transfer failed");

            emit WinningsClaimed(gameId, msg.sender, game.payout);
        }
    }

    /**
     * @notice Fund the house (for payouts)
     */
    function fundHouse() external payable {}

    

    // ============ View Functions ============

    /**
     * @notice Get game info
     */
    function getGame(uint256 gameId) external view returns (
        address player,
        BetType betType,
        uint8 prediction,
        uint256 betAmount,
        bool revealRequested,
        bool revealed,
        bool revealedWon,
        bool claimed,
        uint256 payout
    ) {
        Game storage game = _games[gameId];
        return (
            game.player,
            game.betType,
            game.prediction,
            game.betAmount,
            game.revealRequested,
            game.revealed,
            game.revealedWon,
            game.claimed,
            game.payout
        );
    }

    /**
     * @notice Get total games played
     */
    function getGameCount() external view returns (uint256) {
        return _gameCount;
    }

    /**
     * @notice Get house balance
     */
    function getHouseBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Calculate potential payout
     */
    function calculatePayout(BetType betType, uint256 betAmount) external pure returns (uint256) {
        uint256 multiplier;
        if (betType == BetType.OverUnder) {
            multiplier = OVER_UNDER_PAYOUT;
        } else if (betType == BetType.Exact) {
            multiplier = EXACT_PAYOUT;
        } else {
            multiplier = HIGH_LOW_PAYOUT;
        }
        return (betAmount * multiplier) / 10000;
    }

    

    // ============ Internal Functions ============
    

    receive() external payable {}
}
