// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleKycRegistry
 * @author Gustavo Valverde
 * @notice A simple public KYC allowlist for gating operations
 * @dev Shared helper contract for identity examples requiring KYC checks.
 *      Used by ERC7984ERC20WrapperExample, SwapERC7984ToERC20, SwapERC7984ToERC7984,
 *      and VestingWalletConfidentialExample.
 *
 * @custom:category identity
 * @custom:concept Public KYC allowlist for revert-based compliance gating
 * @custom:difficulty beginner
 *
 * Key patterns:
 * - Simple boolean allowlist (isKycApproved mapping)
 * - Owner-controlled KYC status updates
 * - Emits events for off-chain indexing
 */
contract SimpleKycRegistry is Ownable {
    /// @notice Mapping of addresses to their KYC approval status
    mapping(address account => bool approved) public isKycApproved;

    /// @notice Emitted when a user's KYC status is updated
    /// @param account The address whose KYC status changed
    /// @param approved The new KYC approval status
    event KycUpdated(address indexed account, bool indexed approved);

    /// @notice Creates a new KYC registry with the specified owner
    /// @param initialOwner The address that will own and manage the registry
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Updates the KYC status for a given account
    /// @param account The address to update
    /// @param approved The new KYC approval status
    function setKyc(address account, bool approved) external onlyOwner {
        isKycApproved[account] = approved;
        emit KycUpdated(account, approved);
    }

    /// @notice Batch update KYC status for multiple accounts
    /// @param accounts The addresses to update
    /// @param approved The new KYC approval status for all accounts
    function setKycBatch(address[] calldata accounts, bool approved) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; ++i) {
            isKycApproved[accounts[i]] = approved;
            emit KycUpdated(accounts[i], approved);
        }
    }
}
