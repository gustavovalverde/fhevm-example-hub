// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHECounter
 * @author Gustavo Valverde
 * @notice Encrypted counter with increment and decrement operations.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter basics
 * @custom:concept Encrypted counter using FHE.add and FHE.sub
 * @custom:difficulty beginner
 */
contract FHECounter is ZamaEthereumConfig {
    euint64 private count;

    /// @notice Returns the encrypted counter value.
    /// @return The encrypted counter value
    function getCount() external view returns (euint64) {
        return count;
    }

    /// @notice Increment the counter by an encrypted amount.
    /// @param encAmount Encrypted amount handle
    /// @param inputProof Proof for the encrypted input
    function increment(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        count = FHE.add(count, amount);
        FHE.allowThis(count);
        FHE.allow(count, msg.sender);
    }

    /// @notice Decrement the counter by an encrypted amount.
    /// @param encAmount Encrypted amount handle
    /// @param inputProof Proof for the encrypted input
    function decrement(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        count = FHE.sub(count, amount);
        FHE.allowThis(count);
        FHE.allow(count, msg.sender);
    }
}
