// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptSingleValue
 * @author Gustavo Valverde
 * @notice Publish a single encrypted result for public decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-public, relayer
 * @custom:concept Public decryption flow for a single encrypted value
 * @custom:difficulty intermediate
 */
contract PublicDecryptSingleValue is ZamaEthereumConfig {
    euint64 private lastValue;

    /// @notice Returns the last encrypted value.
    /// @return The last encrypted value
    function getLastValue() external view returns (euint64) {
        return lastValue;
    }

    /// @notice Store an encrypted value.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        lastValue = FHE.fromExternal(encValue, inputProof);
        FHE.allowThis(lastValue);
        FHE.allow(lastValue, msg.sender);
    }

    /// @notice Publish the encrypted value for public decryption.
    function publishValue() external {
        FHE.makePubliclyDecryptable(lastValue);
    }

    /// @notice Returns the handle for public decryption.
    /// @return The encrypted handle as bytes32
    function getValueHandle() external view returns (bytes32) {
        return FHE.toBytes32(lastValue);
    }
}
