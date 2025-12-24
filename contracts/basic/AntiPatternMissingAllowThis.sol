// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternMissingAllowThis
 * @author Gustavo Valverde
 * @notice Demonstrates the pitfall of omitting FHE.allowThis on stored values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept Missing FHE.allowThis breaks reuse of stored handles
 * @custom:difficulty intermediate
 */
contract AntiPatternMissingAllowThis is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value without granting the contract permission.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        // Intentionally missing FHE.allowThis(value)
        FHE.allow(value, msg.sender);
    }

    /// @notice Try to reuse the stored value (expected to fail in practice).
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function addToStored(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        euint64 updated = FHE.add(storedValues[msg.sender], value);
        storedValues[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
    }

    /// @notice Retrieve the stored value.
    /// @param user Account holding the encrypted value
    /// @return The stored encrypted value
    function getStoredValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
