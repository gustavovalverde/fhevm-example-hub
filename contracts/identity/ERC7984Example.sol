// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title ERC7984Example
 * @author Gustavo Valverde
 * @notice Minimal ERC7984 confidential token example.
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept Minimal ERC7984 token with confidential mint + transfer
 * @custom:difficulty beginner
 * @custom:deploy-plan [{"contract":"ERC7984Example","saveAs":"token","args":["$deployer"]}]
 */
contract ERC7984Example is ERC7984, Ownable, ZamaEthereumConfig {
    /**
     * @notice Initialize the minimal ERC7984 token
     * @param initialOwner The address that will own the contract
     */
    constructor(address initialOwner)
        ERC7984("Confidential Token", "CTK", "ipfs://erc7984-example")
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
