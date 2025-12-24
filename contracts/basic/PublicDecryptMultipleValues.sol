// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptMultipleValues
 * @author Gustavo Valverde
 * @notice Publish multiple encrypted results for public decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-public, relayer
 * @custom:concept Public decryption flow for multiple encrypted values
 * @custom:difficulty intermediate
 */
contract PublicDecryptMultipleValues is ZamaEthereumConfig {
    euint64 private lastFirst;
    euint64 private lastSecond;

    /// @notice Store two encrypted values.
    /// @param encFirst First encrypted value handle
    /// @param encSecond Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function storeValues(
        externalEuint64 encFirst,
        externalEuint64 encSecond,
        bytes calldata inputProof
    ) external {
        lastFirst = FHE.fromExternal(encFirst, inputProof);
        lastSecond = FHE.fromExternal(encSecond, inputProof);

        FHE.allowThis(lastFirst);
        FHE.allowThis(lastSecond);
        FHE.allow(lastFirst, msg.sender);
        FHE.allow(lastSecond, msg.sender);
    }

    /// @notice Publish both values for public decryption.
    function publishValues() external {
        FHE.makePubliclyDecryptable(lastFirst);
        FHE.makePubliclyDecryptable(lastSecond);
    }

    /// @notice Returns the handles for public decryption.
    /// @return Handle for the first encrypted value
    /// @return Handle for the second encrypted value
    function getValueHandles() external view returns (bytes32, bytes32) {
        return (FHE.toBytes32(lastFirst), FHE.toBytes32(lastSecond));
    }
}
