// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984ERC20Wrapper, ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ERC7984ERC20WrapperExample - Bridge between ERC20 and Confidential Tokens
/// @notice Wraps an ERC20 token into a confidential ERC7984 token and vice versa
/// @dev Users deposit ERC20, receive ERC7984. Withdraw ERC7984, receive ERC20.
contract ERC7984ERC20WrapperExample is ERC7984ERC20Wrapper, ZamaEthereumConfig {

    // ============ Events ============

    /// @notice Emitted when ERC20 tokens are wrapped into ERC7984
    event TokensWrapped(address indexed user, uint256 amount);

    /// @notice Emitted when ERC7984 tokens are unwrapped to ERC20
    event TokensUnwrapped(address indexed user);

    // ============ Constructor ============

    /// @param underlyingToken The ERC20 token to wrap
    /// @param name_ Name for the wrapped token
    /// @param symbol_ Symbol for the wrapped token
    /// @param uri_ Metadata URI
    constructor(
        IERC20 underlyingToken,
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC7984ERC20Wrapper(underlyingToken) ERC7984(name_, symbol_, uri_) {}

    // ============ View Functions ============

    /// @notice Get total ERC20 tokens held by this wrapper
    function totalDeposited() external view returns (uint256) {
        return IERC20(address(underlying())).balanceOf(address(this));
    }
}
