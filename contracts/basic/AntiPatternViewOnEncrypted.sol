// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternViewOnEncrypted
 * @author Gustavo Valverde
 * @notice Demonstrates why a view call still returns encrypted handles.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept View functions return encrypted handles, not plaintext
 * @custom:difficulty intermediate
 */
contract AntiPatternViewOnEncrypted is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Read the encrypted value from a view function.
    /// @dev The return value is still encrypted and must be decrypted off-chain.
    /// @param user Account holding the encrypted value
    /// @return The encrypted value handle
    function getEncryptedValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
