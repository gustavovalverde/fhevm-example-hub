// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {SimpleKycRegistry} from "./helpers/SimpleKycRegistry.sol";

// solhint-disable max-line-length
/**
 * @title SwapERC7984ToERC20
 * @author Gustavo Valverde
 * @notice Swap a confidential ERC7984 token amount to a public ERC20 via public decryption finalization
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984,swaps
 * @custom:concept ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)
 * @custom:difficulty advanced
 * @custom:depends-on SimpleKycRegistry,MintableConfidentialToken,MockERC20
 * @custom:deploy-plan [{"contract":"SimpleKycRegistry","saveAs":"kyc","args":["$deployer"]},{"contract":"MintableConfidentialToken","saveAs":"confidentialToken","args":["$deployer","Mock Confidential Token","mCONF","ipfs://mintable-erc7984"]},{"contract":"MockERC20","saveAs":"erc20","args":["$deployer",0]},{"contract":"SwapERC7984ToERC20","saveAs":"swap","args":["$deployer","@confidentialToken","@erc20","@kyc"]}]
 *
 * Production alignment:
 * - Offboarding (withdrawal) often requires producing a public amount on-chain while keeping intermediate
 *   computations confidential.
 * - KYC status is enforced publicly (revert-based).
 *
 * Flow:
 * 1) User submits encrypted amount to swap.
 * 2) Swap calls `confidentialTransferFrom` (requires operator approval).
 * 3) Returned `amountTransferred` is made publicly decryptable.
 * 4) Off-chain decryption returns (cleartextAmount, decryptionProof).
 * 5) `finalizeSwap` verifies KMS signatures and transfers ERC20.
 */
contract SwapERC7984ToERC20 is Ownable, ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error NotKycApproved(address account);

    /// @notice Error thrown when finalization is called with an invalid amount handle
    /// @param amount The invalid encrypted amount handle
    error InvalidFinalization(euint64 amount);

    /// @notice Maps encrypted amount handles to their intended receivers
    mapping(euint64 amount => address receiver) private receivers;

    /// @notice The confidential ERC7984 token to swap from
    IERC7984 public immutable fromToken;

    /// @notice The public ERC20 token to swap to
    IERC20 public immutable toToken;

    /// @notice The KYC registry for compliance checks
    SimpleKycRegistry public immutable kyc;

    /**
     * @notice Initializes the swap contract with token addresses and KYC registry
     * @param initialOwner The address that will own the contract
     * @param fromToken_ The ERC7984 token to swap from
     * @param toToken_ The ERC20 token to swap to
     * @param kyc_ The KYC registry contract
     */
    constructor(address initialOwner, IERC7984 fromToken_, IERC20 toToken_, SimpleKycRegistry kyc_)
        Ownable(initialOwner)
    {
        fromToken = fromToken_;
        toToken = toToken_;
        kyc = kyc_;
    }

    /**
     * @notice Swap confidential token amount to public ERC20 (two-step: request + finalize)
     * @dev Requires operator approval on the `fromToken` for this contract.
     * @param encryptedAmount Encrypted amount input (requested swap amount)
     * @param inputProof Proof for the encrypted input
     *
     * Emits `ConfidentialTransfer` on the ERC7984 token; the transferred handle must be
     * publicly decrypted off-chain, then finalized with `finalizeSwap`.
     */
    function swapConfidentialToERC20(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Give the ERC7984 token permission to consume the input ciphertext this tx.
        FHE.allowTransient(amount, address(fromToken));

        // Requires: msg.sender setOperator(this, until)
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // Make result publicly decryptable for off-chain finalization.
        FHE.makePubliclyDecryptable(amountTransferred);
        receivers[amountTransferred] = msg.sender;
    }

    /**
     * @notice Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutAllowingToken(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Missing: FHE.allowTransient(amount, address(fromToken));
        fromToken.confidentialTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Anti-pattern: omit `FHE.makePubliclyDecryptable(amountTransferred)` (finalization becomes impossible)
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutPublishing(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(fromToken));

        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);
        receivers[amountTransferred] = msg.sender;
    }

    /**
     * @notice Finalize a swap using the public decryption proof from `FHE.publicDecrypt`
     * @param amount The encrypted handle that was published during `swapConfidentialToERC20`
     * @param cleartextAmount Decrypted cleartext amount matching `amount`
     * @param decryptionProof KMS signature proof returned by the public decryption endpoint
     */
    function finalizeSwap(euint64 amount, uint64 cleartextAmount, bytes calldata decryptionProof) external {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(amount);

        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);

        address to = receivers[amount];
        if (to == address(0)) revert InvalidFinalization(amount);
        delete receivers[amount];

        if (cleartextAmount != 0) {
            SafeERC20.safeTransfer(toToken, to, cleartextAmount);
        }
    }
}
