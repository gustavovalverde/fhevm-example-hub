// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {SimpleKycRegistry} from "./helpers/SimpleKycRegistry.sol";

// solhint-disable max-line-length
/**
 * @title SwapERC7984ToERC7984
 * @author Gustavo Valverde
 * @notice Swap one confidential ERC7984 token for another using transient permissions
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984,swaps
 * @custom:concept ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)
 * @custom:difficulty intermediate
 * @custom:depends-on SimpleKycRegistry,MintableConfidentialToken
 * @custom:deploy-plan [{"contract":"SimpleKycRegistry","saveAs":"kyc","args":["$deployer"]},{"contract":"MintableConfidentialToken","saveAs":"tokenA","args":["$deployer","Token A","TKA","ipfs://token-a"]},{"contract":"MintableConfidentialToken","saveAs":"tokenB","args":["$deployer","Token B","TKB","ipfs://token-b"]},{"contract":"SwapERC7984ToERC7984","saveAs":"swap","args":["@kyc"]}]
 *
 * Production alignment:
 * - Regulated ecosystems may support multiple confidential assets (e.g., region-specific stablecoins).
 * - Swaps can be mediated by a contract while keeping the swapped amount confidential.
 *
 * Key pattern:
 * - Use `FHE.allowTransient(handle, token)` before passing encrypted amounts to another contract.
 */
contract SwapERC7984ToERC7984 is ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error NotKycApproved(address account);

    /// @notice Error thrown when caller is not an approved operator for the token
    /// @param caller The address attempting the operation
    /// @param token The token that requires operator approval
    error NotOperator(address caller, address token);

    /// @notice The KYC registry for compliance checks
    SimpleKycRegistry public immutable kyc;

    /**
     * @notice Initializes the swap contract with KYC registry
     * @param kyc_ The KYC registry contract
     */
    constructor(SimpleKycRegistry kyc_) {
        kyc = kyc_;
    }

    /**
     * @notice Swap confidential amount from one ERC7984 token to another
     * @dev Requires operator approval on the `fromToken` for this contract.
     * @param fromToken ERC7984 token to transfer from the user into the swap
     * @param toToken ERC7984 token to transfer from the swap to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapConfidentialForConfidential(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Allow token A to consume the input handle in this tx.
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // Allow token B to consume the transferred handle in this tx.
        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }

    /**
     * @notice Anti-pattern: omit `FHE.allowTransient(amountTransferred, address(toToken))` (will revert)
     * @dev Included to demonstrate a common integration pitfall.
     * @param fromToken ERC7984 token to transfer from the user
     * @param toToken ERC7984 token to transfer to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutAllowingToToken(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // Missing: FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }

    /**
     * @notice Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)
     * @dev Included to demonstrate why token contracts need permission to consume ciphertext inputs.
     * @param fromToken ERC7984 token to transfer from the user
     * @param toToken ERC7984 token to transfer to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutAllowingFromToken(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Missing: FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }
}
