// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEIfThenElse
 * @author Gustavo Valverde
 * @notice Use FHE.select to implement an encrypted if/else branch.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Conditional selection on encrypted values using FHE.select
 * @custom:difficulty beginner
 */
contract FHEIfThenElse is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Return the last encrypted result.
    /// @return The last encrypted selection result.
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /**
     * @notice Pick between left/right depending on whether left <= threshold.
     * @dev All three encrypted inputs must be bound to the same proof.
     * @param left Encrypted left value
     * @param right Encrypted right value
     * @param threshold Encrypted threshold value
     * @param inputProof Proof for the encrypted inputs
     */
    function choose(
        externalEuint64 left,
        externalEuint64 right,
        externalEuint64 threshold,
        bytes calldata inputProof
    ) external {
        euint64 leftValue = FHE.fromExternal(left, inputProof);
        euint64 rightValue = FHE.fromExternal(right, inputProof);
        euint64 thresholdValue = FHE.fromExternal(threshold, inputProof);

        ebool takeLeft = FHE.le(leftValue, thresholdValue);
        lastResult = FHE.select(takeLeft, leftValue, rightValue);

        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
