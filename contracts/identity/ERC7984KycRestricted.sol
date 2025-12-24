// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Restricted} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Restricted.sol";

// solhint-disable max-line-length
/**
 * @title ERC7984KycRestricted
 * @author Gustavo Valverde
 * @notice ERC7984 token with public KYC allowlist enforcement (reverts on non-KYC users)
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)
 * @custom:difficulty intermediate
 * @custom:deploy-plan [{"contract":"ERC7984KycRestricted","saveAs":"token","args":["$deployer","KYC Token","KYCT","ipfs://kyc-token"],"afterDeploy":["await token.approveKyc(deployer.address);","console.log(\"Approved KYC for deployer:\", deployer.address);"]}]
 *
 * Production alignment:
 * - Model KYC as a public boolean/allowlist (attestation is public)
 * - Enforce compliance at the token layer (regulated stablecoin / RWA-lite)
 *
 * This example uses OpenZeppelin Confidential Contracts' `ERC7984Restricted` extension and
 * overrides the restriction policy to behave as an allowlist:
 * - `ALLOWED` can hold/transfer
 * - `DEFAULT` and `BLOCKED` cannot
 */
contract ERC7984KycRestricted is ERC7984Restricted, Ownable, ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error KycNotApproved(address account);

    /**
     * @notice Initializes the KYC-restricted ERC7984 token
     * @param initialOwner The address that will own the contract
     * @param name_ The token name
     * @param symbol_ The token symbol
     * @param contractURI_ The contract metadata URI
     */
    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(initialOwner) {}

    // ============ KYC / Allowlist Admin ============

    /**
     * @notice Mark an address as KYC-approved (allowlisted)
     * @param account The address to approve for KYC
     */
    function approveKyc(address account) external onlyOwner {
        _allowUser(account);
    }

    /**
     * @notice Mark an address as not KYC-approved (block)
     * @param account The address to revoke KYC approval from
     */
    function revokeKyc(address account) external onlyOwner {
        _blockUser(account);
    }

    /**
     * @notice Reset an address to default (not allowlisted)
     * @param account The address to reset to default status
     */
    function resetKyc(address account) external onlyOwner {
        _resetUser(account);
    }

    /**
     * @notice Allowlist policy: only ALLOWED accounts are permitted
     * @param account The address to check
     * @return Whether the account is KYC-approved (ALLOWED status)
     */
    function isUserAllowed(address account) public view override returns (bool) {
        return getRestriction(account) == Restriction.ALLOWED;
    }

    // ============ Token Admin ============

    /**
     * @notice Mint confidential tokens (owner-only)
     * @param to Recipient (must be KYC-approved)
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }

    /**
     * @notice Burn confidential tokens (owner-only)
     * @param from Address to burn from (must be KYC-approved)
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function burn(address from, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _burn(from, FHE.fromExternal(amount, inputProof));
    }
}
