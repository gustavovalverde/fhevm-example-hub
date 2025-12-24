// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHESub
 * @author Gustavo Valverde
 * @notice Encrypted subtraction example for two values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Subtract two encrypted values with FHE.sub
 * @custom:difficulty beginner
 */
contract FHESub is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Returns the last encrypted difference.
    /// @return The last encrypted difference
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Subtract two encrypted inputs (a - b) and store the encrypted result.
    /// @param encA First encrypted value handle (minuend)
    /// @param encB Second encrypted value handle (subtrahend)
    /// @param inputProof Proof for the encrypted inputs
    function subValues(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.sub(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
