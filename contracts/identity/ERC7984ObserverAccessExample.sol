// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
// solhint-disable-next-line max-line-length
import {ERC7984ObserverAccess} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ObserverAccess.sol";

/**
 * @title ERC7984ObserverAccessExample
 * @author Gustavo Valverde
 * @notice Travel-Rule style observer access for confidential token balances and transfer amounts
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept ERC7984ObserverAccess for opt-in audit / compliance observers
 * @custom:difficulty intermediate
 * @custom:deploy-plan [{"contract":"ERC7984ObserverAccessExample","saveAs":"token","args":["$deployer"]}]
 *
 * Production alignment:
 * - Users may need to grant a VASP/compliance officer limited visibility for audits / Travel Rule.
 * - `ERC7984ObserverAccess` lets a user opt-in an "observer" that gets ACL access to:
 *   - the user's confidential balance handle
 *   - transfer amount handles involving the user
 *
 * Important pitfall:
 * - ACL grants are permanent for a given ciphertext handle: removing an observer stops *future* grants,
 *   but does not revoke access to ciphertext handles already shared earlier.
 */
contract ERC7984ObserverAccessExample is ERC7984ObserverAccess, Ownable, ZamaEthereumConfig {
    /**
     * @notice Initializes the Observer Access ERC7984 token
     * @param initialOwner The address that will own the contract
     */
    constructor(address initialOwner)
        ERC7984("Observer Access Token", "OAT", "ipfs://observer-access")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mint confidential tokens (owner-only)
     * @param to Recipient
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }
}
