// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternMissingUserAllow
 * @author Gustavo Valverde
 * @notice Forgetting to grant user access prevents decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept Missing FHE.allow(user) blocks user decryption
 * @custom:difficulty intermediate
 */
contract AntiPatternMissingUserAllow is ZamaEthereumConfig {
    mapping(address user => euint64 value) private stored;

    /// @notice Store an encrypted value but forget to grant user access (pitfall).
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        stored[msg.sender] = value;
        FHE.allowThis(value);
    }

    /// @notice Return the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getStoredValue(address user) external view returns (euint64) {
        return stored[user];
    }
}
