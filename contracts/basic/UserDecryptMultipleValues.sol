// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptMultipleValues
 * @author Gustavo Valverde
 * @notice Produce multiple encrypted outputs and allow the user to decrypt both.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-user
 * @custom:concept User decryption flow for multiple encrypted results
 * @custom:difficulty beginner
 */
contract UserDecryptMultipleValues is ZamaEthereumConfig {
    euint64 private lastSum;
    euint64 private lastDifference;

    /// @notice Returns the last encrypted sum.
    /// @return The last encrypted sum
    function getLastSum() external view returns (euint64) {
        return lastSum;
    }

    /// @notice Returns the last encrypted difference.
    /// @return The last encrypted difference
    function getLastDifference() external view returns (euint64) {
        return lastDifference;
    }

    /// @notice Compute sum and difference for two encrypted inputs.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function computeSumAndDifference(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);

        lastSum = FHE.add(a, b);
        lastDifference = FHE.sub(a, b);

        FHE.allowThis(lastSum);
        FHE.allowThis(lastDifference);
        FHE.allow(lastSum, msg.sender);
        FHE.allow(lastDifference, msg.sender);
    }
}
