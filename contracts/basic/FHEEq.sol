// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEEq
 * @author Gustavo Valverde
 * @notice Encrypted equality comparison with FHE.eq.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter comparisons
 * @custom:concept Compare two encrypted values using FHE.eq
 * @custom:difficulty beginner
 */
contract FHEEq is ZamaEthereumConfig {
    ebool private lastResult;

    /// @notice Returns the last encrypted comparison result.
    /// @return The last encrypted comparison result
    function getLastResult() external view returns (ebool) {
        return lastResult;
    }

    /// @notice Compare two encrypted inputs and store the encrypted result.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function compare(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.eq(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
