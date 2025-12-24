// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @author Gustavo Valverde
 * @notice A mock USDC token with 6 decimals for testing
 * @dev Mimics USDC's 6-decimal precision.
 *      Used by ERC7984ERC20WrapperExample tests.
 */
contract MockUSDC is ERC20 {
    /// @notice Creates a new mock USDC token with initial mint
    /// @param to The address to receive the initial mint
    /// @param initialMint The amount to mint initially (in 6-decimal units)
    constructor(address to, uint256 initialMint) ERC20("Mock USDC", "mUSDC") {
        _mint(to, initialMint);
    }

    /// @notice Returns 6 decimals to match real USDC
    /// @return The number of decimals (6)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints tokens to an address (unrestricted for testing)
    /// @param to The recipient address
    /// @param amount The amount to mint (in 6-decimal units)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
