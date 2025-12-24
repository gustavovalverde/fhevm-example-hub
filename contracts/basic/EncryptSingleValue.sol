// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptSingleValue
 * @author Gustavo Valverde
 * @notice Store a single encrypted value for each user.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter encryption
 * @custom:concept Store one encrypted value and grant permissions
 * @custom:difficulty beginner
 */
contract EncryptSingleValue is ZamaEthereumConfig {
    mapping(address user => euint64 value) private values;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        values[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Retrieve the encrypted value for a user.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getValue(address user) external view returns (euint64) {
        return values[user];
    }
}
