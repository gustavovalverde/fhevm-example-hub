// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptMultipleValues
 * @author Gustavo Valverde
 * @notice Store multiple encrypted values in one transaction.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter encryption
 * @custom:concept Store multiple encrypted values with a single proof
 * @custom:difficulty beginner
 */
contract EncryptMultipleValues is ZamaEthereumConfig {
    mapping(address user => euint64 first) private firstValues;
    mapping(address user => euint64 second) private secondValues;

    /// @notice Store two encrypted values for the sender.
    /// @param encFirst First encrypted value handle
    /// @param encSecond Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function storeValues(
        externalEuint64 encFirst,
        externalEuint64 encSecond,
        bytes calldata inputProof
    ) external {
        euint64 first = FHE.fromExternal(encFirst, inputProof);
        euint64 second = FHE.fromExternal(encSecond, inputProof);

        firstValues[msg.sender] = first;
        secondValues[msg.sender] = second;

        FHE.allowThis(first);
        FHE.allowThis(second);
        FHE.allow(first, msg.sender);
        FHE.allow(second, msg.sender);
    }

    /// @notice Retrieve both encrypted values for a user.
    /// @param user Account holding the encrypted values
    /// @return First encrypted value
    /// @return Second encrypted value
    function getValues(address user) external view returns (euint64, euint64) {
        return (firstValues[user], secondValues[user]);
    }
}
