// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleGeneration
 * @author Gustavo Valverde
 * @notice Show how encrypted handles are created and derived without plaintext.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter handles
 * @custom:concept Handles are opaque references; FHE ops create derived handles (symbolic execution)
 * @custom:difficulty intermediate
 */
contract HandleGeneration is ZamaEthereumConfig {
    mapping(address user => euint64 value) private stored;
    mapping(address user => euint64 value) private derived;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        stored[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Create a derived handle by adding and doubling (symbolic execution).
    /// @param addend Plaintext addend applied to the stored encrypted value
    function deriveValue(uint64 addend) external {
        euint64 baseValue = stored[msg.sender];
        euint64 withAdd = FHE.add(baseValue, addend);
        euint64 doubled = FHE.add(withAdd, withAdd);
        derived[msg.sender] = doubled;
        FHE.allowThis(doubled);
        FHE.allow(doubled, msg.sender);
    }

    /// @notice Return the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getStoredValue(address user) external view returns (euint64) {
        return stored[user];
    }

    /// @notice Return the derived encrypted value.
    /// @param user Account holding the derived value
    /// @return The encrypted derived value
    function getDerivedValue(address user) external view returns (euint64) {
        return derived[user];
    }

    /// @notice Return the raw handle bytes for the stored value.
    /// @param user Account holding the encrypted value
    /// @return Raw handle bytes for the stored value
    function getStoredHandle(address user) external view returns (bytes32) {
        return FHE.toBytes32(stored[user]);
    }

    /// @notice Return the raw handle bytes for the derived value.
    /// @param user Account holding the derived value
    /// @return Raw handle bytes for the derived value
    function getDerivedHandle(address user) external view returns (bytes32) {
        return FHE.toBytes32(derived[user]);
    }
}
