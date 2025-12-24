// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title InputProofsExplained
 * @author Gustavo Valverde
 * @notice Demonstrate input proof binding to contract and signer.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter input-proofs
 * @custom:concept Input proofs bind encrypted inputs to a contract and sender
 * @custom:difficulty intermediate
 */
contract InputProofsExplained is ZamaEthereumConfig {
    mapping(address user => euint64 secret) private secrets;

    /// @notice Store an encrypted secret for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeSecret(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        secrets[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Retrieve the encrypted secret for a user.
    /// @param user Account holding the encrypted secret
    /// @return The encrypted secret value
    function getSecret(address user) external view returns (euint64) {
        return secrets[user];
    }
}
