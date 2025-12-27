// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LotteryERC7984 - Provably Fair Lottery with Confidential Token Payments
/// @notice A lottery where entries and prizes are paid in ERC7984 confidential tokens
/// @dev Combines FHE random number generation with ERC7984 token transfers
contract LotteryERC7984 is ZamaEthereumConfig, Ownable, ReentrancyGuard {

    // ============ Errors ============

    error LotteryAlreadyDrawn();
    error LotteryNotDrawn();
    error WinnerNotRevealed();
    error NotEnoughParticipants();
    error NotWinner();
    error PrizeAlreadyClaimed();
    error AlreadyEntered();
    error InvalidDecryptionProof();
    error NotOperator();

    // ============ Events ============

    event LotteryEntered(address indexed participant, uint256 participantIndex);
    event WinnerDrawn(uint256 totalParticipants);
    event WinnerReadyForReveal();
    event WinnerRevealed(uint256 winnerIndex, address winner);
    event PrizeClaimed(address indexed winner);

    // ============ State ============

    /// @dev The ERC7984 token used for payments
    IERC7984 public immutable paymentToken;

    /// @dev Ticket price (public, but paid in encrypted token)
    uint64 public ticketPrice;

    /// @dev List of participants
    address[] private _participants;

    /// @dev Track who has entered
    mapping(address => bool) private _hasEntered;

    /// @dev Total prize pool (encrypted)
    euint64 private _prizePool;

    /// @dev Encrypted winner index
    euint64 private _encryptedWinnerIndex;

    /// @dev Revealed winner index
    uint256 private _revealedWinnerIndex;

    /// @dev Lottery state flags
    bool private _isDrawn;
    bool private _isRevealed;
    bool private _isClaimed;

    /// @dev Lottery end time
    uint256 private _endTime;

    // ============ Constructor ============

    constructor(
        IERC7984 _paymentToken,
        uint64 _ticketPrice,
        uint256 durationSeconds
    ) Ownable(msg.sender) {
        paymentToken = _paymentToken;
        ticketPrice = _ticketPrice;
        _endTime = block.timestamp + durationSeconds;
    }

    // ============ Entry Functions ============

    /// @notice Enter the lottery by paying the ticket price in ERC7984 tokens
    /// @param encryptedAmount Encrypted ticket payment (should equal ticketPrice)
    /// @param inputProof Proof for the encrypted input
    function enter(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        if (_isDrawn) revert LotteryAlreadyDrawn();
        if (block.timestamp > _endTime) revert LotteryAlreadyDrawn();
        if (_hasEntered[msg.sender]) revert AlreadyEntered();

        // Verify caller is operator for the token
        if (!paymentToken.isOperator(msg.sender, address(this))) {
            revert NotOperator();
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer ticket payment to this contract
        FHE.allowTransient(amount, address(paymentToken));
        euint64 transferred = paymentToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Add to prize pool
        _prizePool = FHE.add(_prizePool, transferred);
        FHE.allowThis(_prizePool);

        // Register participant
        _participants.push(msg.sender);
        _hasEntered[msg.sender] = true;

        emit LotteryEntered(msg.sender, _participants.length - 1);
    }

    // ============ Draw Functions ============

    /// @notice Draw the winner using encrypted randomness
    function draw() external onlyOwner {
        if (_isDrawn) revert LotteryAlreadyDrawn();
        if (_participants.length < 2) revert NotEnoughParticipants();

        // Generate encrypted random winner index
        euint64 randomValue = FHE.randEuint64();
        uint64 participantCount = uint64(_participants.length);
        _encryptedWinnerIndex = FHE.rem(randomValue, participantCount);

        FHE.allowThis(_encryptedWinnerIndex);
        _isDrawn = true;

        emit WinnerDrawn(_participants.length);
    }

    /// @notice Request winner index to be decrypted
    function requestWinnerReveal() external {
        if (!_isDrawn) revert LotteryNotDrawn();
        if (_isRevealed) revert WinnerNotRevealed();

        FHE.makePubliclyDecryptable(_encryptedWinnerIndex);
        emit WinnerReadyForReveal();
    }

    /// @notice Finalize winner reveal with decryption proof
    function finalizeWinnerReveal(
        uint256 winnerIndex,
        bytes calldata decryptionProof
    ) external {
        if (!_isDrawn) revert LotteryNotDrawn();
        if (_isRevealed) revert WinnerNotRevealed();
        require(winnerIndex < _participants.length, "Invalid index");

        // Verify decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(_encryptedWinnerIndex);
        bytes memory cleartexts = abi.encode(winnerIndex);
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        _revealedWinnerIndex = winnerIndex;
        _isRevealed = true;

        emit WinnerRevealed(winnerIndex, _participants[winnerIndex]);
    }

    // ============ Claim Functions ============

    /// @notice Claim the prize if you are the winner
    function claimPrize() external nonReentrant {
        if (!_isRevealed) revert WinnerNotRevealed();
        if (_isClaimed) revert PrizeAlreadyClaimed();
        if (_participants[_revealedWinnerIndex] != msg.sender) revert NotWinner();

        _isClaimed = true;

        // Transfer prize pool to winner
        FHE.allowTransient(_prizePool, address(paymentToken));
        paymentToken.confidentialTransfer(msg.sender, _prizePool);

        emit PrizeClaimed(msg.sender);
    }

    // ============ View Functions ============

    function getParticipantCount() external view returns (uint256) {
        return _participants.length;
    }

    function getTicketPrice() external view returns (uint64) {
        return ticketPrice;
    }

    function getEndTime() external view returns (uint256) {
        return _endTime;
    }

    function isDrawn() external view returns (bool) {
        return _isDrawn;
    }

    function isRevealed() external view returns (bool) {
        return _isRevealed;
    }

    function isClaimed() external view returns (bool) {
        return _isClaimed;
    }

    function getWinner() external view returns (address) {
        if (!_isRevealed) revert WinnerNotRevealed();
        return _participants[_revealedWinnerIndex];
    }

    function hasEntered(address participant) external view returns (bool) {
        return _hasEntered[participant];
    }

    function getParticipant(uint256 index) external view returns (address) {
        require(index < _participants.length, "Index out of bounds");
        return _participants[index];
    }

    function getEncryptedPrizePool() external view returns (euint64) {
        return _prizePool;
    }
}
