// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleLifecycle
 * @author Gustavo Valverde
 * @notice Show how encrypted handles can be stored and reused safely.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter handles
 * @custom:concept Store encrypted handles and reuse them across calls
 * @custom:difficulty intermediate
 */
contract HandleLifecycle is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Add an encrypted value to the stored handle.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function addToStored(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        euint64 updated = FHE.add(storedValues[msg.sender], value);
        storedValues[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
    }

    /// @notice Retrieve the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The stored encrypted value
    function getStoredValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
