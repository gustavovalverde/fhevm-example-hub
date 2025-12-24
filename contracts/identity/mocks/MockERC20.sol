// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @author Gustavo Valverde
 * @notice A simple mock ERC20 token for testing
 * @dev Provides public mint function for test scenarios.
 *      Used by SwapERC7984ToERC20 tests.
 */
contract MockERC20 is ERC20 {
    /// @notice Creates a new mock ERC20 token with initial mint
    /// @param to The address to receive the initial mint
    /// @param initialMint The amount to mint initially
    constructor(address to, uint256 initialMint) ERC20("Mock USD", "mUSD") {
        _mint(to, initialMint);
    }

    /// @notice Mints tokens to an address (unrestricted for testing)
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
