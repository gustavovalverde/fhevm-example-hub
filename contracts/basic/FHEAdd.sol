// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEAdd
 * @author Gustavo Valverde
 * @notice Encrypted addition example for two values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Add two encrypted values with FHE.add
 * @custom:difficulty beginner
 */
contract FHEAdd is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Returns the last encrypted sum.
    /// @return The last encrypted sum
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Add two encrypted inputs and store the encrypted result.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function addValues(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.add(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
