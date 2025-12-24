// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptSingleValue
 * @author Gustavo Valverde
 * @notice Compute on encrypted input and allow the user to decrypt the result.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-user
 * @custom:concept User decryption flow for a single encrypted result
 * @custom:difficulty beginner
 */
contract UserDecryptSingleValue is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Get the encrypted result.
    /// @return The encrypted result
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Add 1 to the encrypted input and store the encrypted result.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function computePlusOne(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        lastResult = FHE.add(value, FHE.asEuint64(1));
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
