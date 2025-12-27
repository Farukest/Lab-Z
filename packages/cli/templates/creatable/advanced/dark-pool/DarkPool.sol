// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title DarkPool - Private DEX Order Book
/// @notice A dark pool where orders are matched without revealing prices
/// @dev Uses FHE for encrypted order matching with async public decryption
contract DarkPool is ZamaEthereumConfig {

    // ============ Enums ============

    enum OrderSide { Buy, Sell }
    enum OrderStatus { Active, Matching, Filled, Cancelled }

    // ============ Structs ============

    struct Order {
        address trader;
        OrderSide side;
        euint64 encryptedPrice;
        euint64 encryptedAmount;
        euint64 filledAmount;
        OrderStatus status;
        uint256 timestamp;
    }

    struct PendingMatch {
        uint256 buyOrderId;
        uint256 sellOrderId;
        ebool canMatch;
        bool isResolved;
    }

    // ============ Errors ============

    error OrderNotFound(uint256 orderId);
    error OrderNotActive(uint256 orderId);
    error NotOrderOwner();
    error NoMatchFound();
    error InvalidOrder();
    error MatchNotPending();
    error MatchAlreadyResolved();
    error InvalidDecryptionProof();


    // ============ Events ============

    event OrderPlaced(uint256 indexed orderId, address indexed trader, OrderSide side);
    event OrderCancelled(uint256 indexed orderId);
    event MatchRequested(uint256 indexed matchId, uint256 buyOrderId, uint256 sellOrderId);
    event MatchReadyForReveal(uint256 indexed matchId);
    event MatchRevealed(uint256 indexed matchId, bool canMatch);
    event TradeExecuted(uint256 indexed buyOrderId, uint256 indexed sellOrderId, address buyer, address seller);


    // ============ State Variables ============

    mapping(uint256 => Order) private _orders;
    mapping(uint256 => PendingMatch) private _pendingMatches;

    uint256 private _orderCount;
    uint256 private _matchCount;

    uint256[] private _activeBuyOrders;
    uint256[] private _activeSellOrders;

    uint256 public minOrderAmount;



    // ============ Modifiers ============



    // ============ Constructor ============

    constructor(uint256 _minOrderAmount) {
        minOrderAmount = _minOrderAmount;

    }

    // ============ External Functions ============

    /// @notice Place a buy order with encrypted price and amount
    function placeBuyOrder(
        externalEuint64 encryptedPrice,
        bytes calldata priceProof,
        externalEuint64 encryptedAmount,
        bytes calldata amountProof
    ) external  returns (uint256 orderId) {


        euint64 price = FHE.fromExternal(encryptedPrice, priceProof);
        euint64 amount = FHE.fromExternal(encryptedAmount, amountProof);

        orderId = ++_orderCount;
        _orders[orderId] = Order({
            trader: msg.sender,
            side: OrderSide.Buy,
            encryptedPrice: price,
            encryptedAmount: amount,
            filledAmount: FHE.asEuint64(0),
            status: OrderStatus.Active,
            timestamp: block.timestamp
        });

        FHE.allowThis(_orders[orderId].encryptedPrice);
        FHE.allowThis(_orders[orderId].encryptedAmount);
        FHE.allowThis(_orders[orderId].filledAmount);
        FHE.allow(_orders[orderId].encryptedPrice, msg.sender);
        FHE.allow(_orders[orderId].encryptedAmount, msg.sender);

        _activeBuyOrders.push(orderId);



        emit OrderPlaced(orderId, msg.sender, OrderSide.Buy);
    }

    /// @notice Place a sell order with encrypted price and amount
    function placeSellOrder(
        externalEuint64 encryptedPrice,
        bytes calldata priceProof,
        externalEuint64 encryptedAmount,
        bytes calldata amountProof
    ) external  returns (uint256 orderId) {


        euint64 price = FHE.fromExternal(encryptedPrice, priceProof);
        euint64 amount = FHE.fromExternal(encryptedAmount, amountProof);

        orderId = ++_orderCount;
        _orders[orderId] = Order({
            trader: msg.sender,
            side: OrderSide.Sell,
            encryptedPrice: price,
            encryptedAmount: amount,
            filledAmount: FHE.asEuint64(0),
            status: OrderStatus.Active,
            timestamp: block.timestamp
        });

        FHE.allowThis(_orders[orderId].encryptedPrice);
        FHE.allowThis(_orders[orderId].encryptedAmount);
        FHE.allowThis(_orders[orderId].filledAmount);
        FHE.allow(_orders[orderId].encryptedPrice, msg.sender);
        FHE.allow(_orders[orderId].encryptedAmount, msg.sender);

        _activeSellOrders.push(orderId);



        emit OrderPlaced(orderId, msg.sender, OrderSide.Sell);
    }

    /// @notice Cancel an active order
    function cancelOrder(uint256 orderId) external {
        Order storage order = _orders[orderId];

        if (order.trader == address(0)) revert OrderNotFound(orderId);
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.status != OrderStatus.Active) revert OrderNotActive(orderId);

        order.status = OrderStatus.Cancelled;

        emit OrderCancelled(orderId);
    }

    /// @notice Request matching check between buy and sell orders
    /// @dev Step 1: Creates encrypted comparison, marks for decryption
    function requestMatch(uint256 buyOrderId, uint256 sellOrderId) external returns (uint256 matchId) {


        Order storage buyOrder = _orders[buyOrderId];
        Order storage sellOrder = _orders[sellOrderId];

        if (buyOrder.trader == address(0)) revert OrderNotFound(buyOrderId);
        if (sellOrder.trader == address(0)) revert OrderNotFound(sellOrderId);
        if (buyOrder.status != OrderStatus.Active) revert OrderNotActive(buyOrderId);
        if (sellOrder.status != OrderStatus.Active) revert OrderNotActive(sellOrderId);
        if (buyOrder.side != OrderSide.Buy) revert InvalidOrder();
        if (sellOrder.side != OrderSide.Sell) revert InvalidOrder();

        // Encrypted comparison: buyPrice >= sellPrice
        ebool canMatch = FHE.ge(buyOrder.encryptedPrice, sellOrder.encryptedPrice);

        matchId = ++_matchCount;
        _pendingMatches[matchId] = PendingMatch({
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            canMatch: canMatch,
            isResolved: false
        });

        // Mark orders as pending match
        buyOrder.status = OrderStatus.Matching;
        sellOrder.status = OrderStatus.Matching;

        FHE.allowThis(canMatch);

        // Mark for public decryption
        FHE.makePubliclyDecryptable(canMatch);

        emit MatchRequested(matchId, buyOrderId, sellOrderId);
        emit MatchReadyForReveal(matchId);


    }

    /// @notice Get the encrypted match result handle for off-chain decryption
    function getMatchHandle(uint256 matchId) external view returns (ebool) {
        PendingMatch storage pm = _pendingMatches[matchId];
        if (pm.buyOrderId == 0) revert MatchNotPending();
        return pm.canMatch;
    }

    /// @notice Finalize match with decryption proof
    /// @dev Step 3: Verify decryption and execute trade if matched
    function finalizeMatch(
        uint256 matchId,
        bool canMatchResult,
        bytes calldata decryptionProof
    ) external {
        PendingMatch storage pm = _pendingMatches[matchId];

        if (pm.buyOrderId == 0) revert MatchNotPending();
        if (pm.isResolved) revert MatchAlreadyResolved();

        // Verify decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(pm.canMatch);

        bytes memory cleartexts = abi.encode(canMatchResult);

        // This reverts if proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        pm.isResolved = true;

        Order storage buyOrder = _orders[pm.buyOrderId];
        Order storage sellOrder = _orders[pm.sellOrderId];

        if (canMatchResult) {
            // Execute trade
            _executeMatch(pm.buyOrderId, pm.sellOrderId);

            emit MatchRevealed(matchId, true);
        } else {
            // No match - revert orders to active
            buyOrder.status = OrderStatus.Active;
            sellOrder.status = OrderStatus.Active;

            emit MatchRevealed(matchId, false);
        }
    }



    // ============ View Functions ============

    function getOrderCount() external view returns (uint256) {
        return _orderCount;
    }

    function getMatchCount() external view returns (uint256) {
        return _matchCount;
    }

    function getActiveBuyOrderCount() external view returns (uint256) {
        return _activeBuyOrders.length;
    }

    function getActiveSellOrderCount() external view returns (uint256) {
        return _activeSellOrders.length;
    }

    function getOrderInfo(uint256 orderId) external view returns (
        address trader,
        OrderSide side,
        OrderStatus status,
        uint256 timestamp
    ) {
        Order storage order = _orders[orderId];
        return (order.trader, order.side, order.status, order.timestamp);
    }

    function getMatchInfo(uint256 matchId) external view returns (
        uint256 buyOrderId,
        uint256 sellOrderId,
        bool isResolved
    ) {
        PendingMatch storage pm = _pendingMatches[matchId];
        return (pm.buyOrderId, pm.sellOrderId, pm.isResolved);
    }

    function getOrderPrice(uint256 orderId) external view returns (euint64) {
        return _orders[orderId].encryptedPrice;
    }

    function getOrderAmount(uint256 orderId) external view returns (euint64) {
        return _orders[orderId].encryptedAmount;
    }



    // ============ Internal Functions ============

    function _executeMatch(uint256 buyOrderId, uint256 sellOrderId) internal {
        Order storage buyOrder = _orders[buyOrderId];
        Order storage sellOrder = _orders[sellOrderId];

        // Calculate trade amount: min(buyAmount - buyFilled, sellAmount - sellFilled)
        euint64 buyRemaining = FHE.sub(buyOrder.encryptedAmount, buyOrder.filledAmount);
        euint64 sellRemaining = FHE.sub(sellOrder.encryptedAmount, sellOrder.filledAmount);
        euint64 tradeAmount = FHE.min(buyRemaining, sellRemaining);

        // Update filled amounts
        buyOrder.filledAmount = FHE.add(buyOrder.filledAmount, tradeAmount);
        sellOrder.filledAmount = FHE.add(sellOrder.filledAmount, tradeAmount);

        FHE.allowThis(buyOrder.filledAmount);
        FHE.allowThis(sellOrder.filledAmount);
        FHE.allowThis(tradeAmount);

        // Mark as filled (simplified - full implementation would check remaining)
        buyOrder.status = OrderStatus.Filled;
        sellOrder.status = OrderStatus.Filled;

        emit TradeExecuted(buyOrderId, sellOrderId, buyOrder.trader, sellOrder.trader);
    }


}
