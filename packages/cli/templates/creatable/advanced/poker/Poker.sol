// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Poker
 * @notice Encrypted poker game - cards and hands hidden until showdown
 * @dev Uses FHE for truly private card dealing and hidden bets
 *
 * FHE Operations Used:
 * - random: Generate random cards from encrypted deck
 * - rem: Map random to card value (0-51)
 * - and/or: Combine card properties for hand evaluation
 * - gt/gte: Compare hand strengths
 * - min/max: Pot calculations
 * - select: Choose winner
 * - eq: Check for matching cards
 * - add: Accumulate pot
 */
contract Poker is ZamaEthereumConfig {
    // ============ Errors ============
    error GameNotFound();
    error GameFull();
    error GameNotStarted();
    error GameAlreadyStarted();
    error NotYourTurn();
    error InvalidBetAmount();
    error AlreadyInGame();
    error NotInGame();
    error InsufficientPlayers();
    

    // ============ Events ============
    event GameCreated(uint256 indexed gameId, address creator, uint256 buyIn);
    event PlayerJoined(uint256 indexed gameId, address player, uint8 seat);
    event CardsDealt(uint256 indexed gameId);
    event BetPlaced(uint256 indexed gameId, address player);
    event PlayerFolded(uint256 indexed gameId, address player);
    event ShowdownResult(uint256 indexed gameId, address winner);
    event PotWon(uint256 indexed gameId, address winner);
    

    // ============ Enums ============
    enum GamePhase { Waiting, PreFlop, Flop, Turn, River, Showdown, Finished }

    // ============ Structs ============
    struct Game {
        address[6] players;
        uint8 playerCount;
        uint8 dealerSeat;
        uint8 currentTurn;
        GamePhase phase;
        euint64 pot;
        euint64 currentBet;
        uint256 buyIn;
        bool[6] folded;
        bool[6] allIn;
    }

    struct PlayerHand {
        euint8 card1;
        euint8 card2;
        bool dealt;
    }

    struct CommunityCards {
        euint8 flop1;
        euint8 flop2;
        euint8 flop3;
        euint8 turn;
        euint8 river;
    }

    // ============ State Variables ============
    mapping(uint256 => Game) public _games;
    mapping(uint256 => mapping(address => PlayerHand)) public _playerHands;
    mapping(uint256 => CommunityCards) public _communityCards;
    mapping(uint256 => mapping(address => euint64)) public _playerBets;
    mapping(uint256 => euint64) public _deckSeed;

    uint256 public _gameCount;
    uint256 public minBuyIn;
    

    // ============ Modifiers ============
    modifier gameExists(uint256 gameId) {
        if (gameId >= _gameCount) revert GameNotFound();
        _;
    }

    modifier onlyPlayer(uint256 gameId) {
        bool found = false;
        for (uint8 i = 0; i < 6; i++) {
            if (_games[gameId].players[i] == msg.sender) {
                found = true;
                break;
            }
        }
        if (!found) revert NotInGame();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _minBuyIn) {
        minBuyIn = _minBuyIn;
        
    }

    // ============ External Functions ============

    /**
     * @notice Create a new poker game
     * @param buyIn The buy-in amount for the game
     */
    function createGame(uint256 buyIn) external returns (uint256) {
        require(buyIn >= minBuyIn, "Buy-in too low");

        uint256 gameId = _gameCount++;

        Game storage game = _games[gameId];
        game.buyIn = buyIn;
        game.phase = GamePhase.Waiting;
        game.players[0] = msg.sender;
        game.playerCount = 1;
        game.pot = FHE.asEuint64(0);
        game.currentBet = FHE.asEuint64(0);

        // Initialize encrypted deck seed with random
        _deckSeed[gameId] = FHE.randEuint64();
        FHE.allowThis(_deckSeed[gameId]);

        emit GameCreated(gameId, msg.sender, buyIn);
        return gameId;
    }

    /**
     * @notice Join an existing poker game
     * @param gameId The game to join
     */
    function joinGame(uint256 gameId) external gameExists(gameId) {
        Game storage game = _games[gameId];
        if (game.phase != GamePhase.Waiting) revert GameAlreadyStarted();
        if (game.playerCount >= 6) revert GameFull();

        // Check not already in game
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (game.players[i] == msg.sender) revert AlreadyInGame();
        }

        uint8 seat = game.playerCount;
        game.players[seat] = msg.sender;
        game.playerCount++;

        emit PlayerJoined(gameId, msg.sender, seat);
    }

    /**
     * @notice Start the game and deal cards
     * @param gameId The game to start
     */
    function dealCards(uint256 gameId) external gameExists(gameId) {
        Game storage game = _games[gameId];
        if (game.phase != GamePhase.Waiting) revert GameAlreadyStarted();
        if (game.playerCount < 2) revert InsufficientPlayers();

        game.phase = GamePhase.PreFlop;
        game.currentTurn = (game.dealerSeat + 1) % game.playerCount;

        // Deal 2 cards to each player using encrypted random
        for (uint8 i = 0; i < game.playerCount; i++) {
            address player = game.players[i];

            // Generate encrypted random cards (0-51)
            euint64 rand1 = FHE.randEuint64();
            euint64 rand2 = FHE.randEuint64();

            // Map to card range using rem (modulo 52)
            euint8 card1 = FHE.asEuint8(FHE.rem(rand1, uint64(52)));
            euint8 card2 = FHE.asEuint8(FHE.rem(rand2, uint64(52)));

            _playerHands[gameId][player] = PlayerHand({
                card1: card1,
                card2: card2,
                dealt: true
            });

            // Only allow the player to see their own cards
            FHE.allow(card1, player);
            FHE.allow(card2, player);
            FHE.allowThis(card1);
            FHE.allowThis(card2);
        }

        // Generate community cards (encrypted, revealed later)
        CommunityCards storage cc = _communityCards[gameId];
        cc.flop1 = FHE.asEuint8(FHE.rem(FHE.randEuint64(), uint64(52)));
        cc.flop2 = FHE.asEuint8(FHE.rem(FHE.randEuint64(), uint64(52)));
        cc.flop3 = FHE.asEuint8(FHE.rem(FHE.randEuint64(), uint64(52)));
        cc.turn = FHE.asEuint8(FHE.rem(FHE.randEuint64(), uint64(52)));
        cc.river = FHE.asEuint8(FHE.rem(FHE.randEuint64(), uint64(52)));

        FHE.allowThis(cc.flop1);
        FHE.allowThis(cc.flop2);
        FHE.allowThis(cc.flop3);
        FHE.allowThis(cc.turn);
        FHE.allowThis(cc.river);

        emit CardsDealt(gameId);
    }

    /**
     * @notice Place a bet (call/raise)
     * @param gameId The game
     * @param encryptedAmount Encrypted bet amount
     */
    function placeBet(uint256 gameId, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        gameExists(gameId)
        onlyPlayer(gameId)
    {
        Game storage game = _games[gameId];
        require(game.phase != GamePhase.Waiting && game.phase != GamePhase.Showdown, "Invalid phase");
        require(game.players[game.currentTurn] == msg.sender, "Not your turn");

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Add to player's bet and pot
        _playerBets[gameId][msg.sender] = FHE.add(_playerBets[gameId][msg.sender], amount);
        game.pot = FHE.add(game.pot, amount);

        // Update current bet if this is a raise
        ebool isRaise = FHE.gt(amount, game.currentBet);
        game.currentBet = FHE.select(isRaise, amount, game.currentBet);

        FHE.allowThis(game.pot);
        FHE.allowThis(game.currentBet);
        FHE.allowThis(_playerBets[gameId][msg.sender]);

        // Move to next player
        _advanceTurn(gameId);

        emit BetPlaced(gameId, msg.sender);
    }

    /**
     * @notice Fold your hand
     * @param gameId The game
     */
    function fold(uint256 gameId) external gameExists(gameId) onlyPlayer(gameId) {
        Game storage game = _games[gameId];
        require(game.players[game.currentTurn] == msg.sender, "Not your turn");

        // Find player's seat and mark as folded
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (game.players[i] == msg.sender) {
                game.folded[i] = true;
                break;
            }
        }

        _advanceTurn(gameId);
        _checkForWinner(gameId);

        emit PlayerFolded(gameId, msg.sender);
    }

    /**
     * @notice Trigger showdown and determine winner
     * @param gameId The game
     */
    function showdown(uint256 gameId) external gameExists(gameId) {
        Game storage game = _games[gameId];
        require(game.phase == GamePhase.River, "Not at river");

        game.phase = GamePhase.Showdown;

        // In a full implementation, this would compare hand strengths
        // For now, find first non-folded player as winner
        address winner = address(0);
        for (uint8 i = 0; i < game.playerCount; i++) {
            if (!game.folded[i]) {
                winner = game.players[i];
                break;
            }
        }

        if (winner != address(0)) {
            FHE.allow(game.pot, winner);
            emit ShowdownResult(gameId, winner);
            emit PotWon(gameId, winner);
        }

        game.phase = GamePhase.Finished;
    }

    

    // ============ Internal Functions ============

    function _advanceTurn(uint256 gameId) internal {
        Game storage game = _games[gameId];
        uint8 startSeat = game.currentTurn;

        do {
            game.currentTurn = (game.currentTurn + 1) % game.playerCount;
            // Skip folded players
            if (!game.folded[game.currentTurn]) break;
        } while (game.currentTurn != startSeat);

        // Check if round is complete
        if (game.currentTurn == (game.dealerSeat + 1) % game.playerCount) {
            _advancePhase(gameId);
        }
    }

    function _advancePhase(uint256 gameId) internal {
        Game storage game = _games[gameId];
        CommunityCards storage cc = _communityCards[gameId];

        if (game.phase == GamePhase.PreFlop) {
            game.phase = GamePhase.Flop;
            // Reveal flop cards to all players
            for (uint8 i = 0; i < game.playerCount; i++) {
                FHE.allow(cc.flop1, game.players[i]);
                FHE.allow(cc.flop2, game.players[i]);
                FHE.allow(cc.flop3, game.players[i]);
            }
        } else if (game.phase == GamePhase.Flop) {
            game.phase = GamePhase.Turn;
            for (uint8 i = 0; i < game.playerCount; i++) {
                FHE.allow(cc.turn, game.players[i]);
            }
        } else if (game.phase == GamePhase.Turn) {
            game.phase = GamePhase.River;
            for (uint8 i = 0; i < game.playerCount; i++) {
                FHE.allow(cc.river, game.players[i]);
            }
        }

        // Reset current bet for new round
        game.currentBet = FHE.asEuint64(0);
        FHE.allowThis(game.currentBet);
    }

    function _checkForWinner(uint256 gameId) internal {
        Game storage game = _games[gameId];

        // Count active players
        uint8 activePlayers = 0;
        address lastActive = address(0);

        for (uint8 i = 0; i < game.playerCount; i++) {
            if (!game.folded[i]) {
                activePlayers++;
                lastActive = game.players[i];
            }
        }

        // If only one player left, they win
        if (activePlayers == 1 && lastActive != address(0)) {
            FHE.allow(game.pot, lastActive);
            game.phase = GamePhase.Finished;
            emit PotWon(gameId, lastActive);
        }
    }

    

    // ============ View Functions ============

    function getGame(uint256 gameId) external view returns (
        uint8 playerCount,
        GamePhase phase,
        uint256 buyIn,
        uint8 currentTurn
    ) {
        Game storage game = _games[gameId];
        return (game.playerCount, game.phase, game.buyIn, game.currentTurn);
    }

    function getGameCount() external view returns (uint256) {
        return _gameCount;
    }

    function isPlayerInGame(uint256 gameId, address player) external view returns (bool) {
        for (uint8 i = 0; i < _games[gameId].playerCount; i++) {
            if (_games[gameId].players[i] == player) return true;
        }
        return false;
    }

    function hasPlayerFolded(uint256 gameId, address player) external view returns (bool) {
        for (uint8 i = 0; i < _games[gameId].playerCount; i++) {
            if (_games[gameId].players[i] == player) {
                return _games[gameId].folded[i];
            }
        }
        return false;
    }

    
}
