// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
// solhint-disable-next-line max-line-length
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {SimpleKycRegistry} from "./helpers/SimpleKycRegistry.sol";

// solhint-disable max-line-length
/**
 * @title ERC7984ERC20WrapperExample
 * @author Gustavo Valverde
 * @notice Wrap a public ERC20 into a confidential ERC7984 token, and unwrap back via public decryption
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap
 * @custom:difficulty advanced
 * @custom:depends-on SimpleKycRegistry,MockUSDC
 * @custom:deploy-plan [{"contract":"SimpleKycRegistry","saveAs":"kyc","args":["$deployer"]},{"contract":"MockUSDC","saveAs":"usdc","args":["$deployer",0]},{"contract":"ERC7984ERC20WrapperExample","saveAs":"wrapper","args":["$deployer","@usdc","@kyc"],"afterDeploy":["await kyc.setKyc(deployer.address, true);"]}]
 *
 * Production alignment:
 * - Onboarding/offboarding flows often require moving between public assets and confidential balances.
 * - KYC status is public in this scenario: non-KYC users are rejected (revert-based compliance).
 *
 * Key ideas:
 * - `wrap()` is synchronous: ERC20 is transferred in, confidential ERC7984 is minted out.
 * - `unwrap()` is asynchronous: confidential amount is burnt and made publicly decryptable;
 *   `finalizeUnwrap()` verifies KMS signatures (`FHE.checkSignatures`) and transfers ERC20 out.
 */
contract ERC7984ERC20WrapperExample is ERC7984ERC20Wrapper, Ownable, ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice The KYC registry for compliance checks
    SimpleKycRegistry public immutable kyc;

    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error NotKycApproved(address account);

    /**
     * @notice Initializes the wrapper with underlying token and KYC registry
     * @param initialOwner The address that will own the contract
     * @param underlying_ The ERC20 token to wrap
     * @param kyc_ The KYC registry contract
     */
    constructor(address initialOwner, IERC20 underlying_, SimpleKycRegistry kyc_)
        ERC7984("Wrapped Confidential USDC", "wcUSDC", "ipfs://erc7984-erc20-wrapper")
        ERC7984ERC20Wrapper(underlying_)
        Ownable(initialOwner)
    {
        kyc = kyc_;
    }

    /**
     * @notice Wrap ERC20 into confidential ERC7984 balance (KYC-gated)
     * @dev Reverts if caller or recipient is not KYC-approved.
     * @param to Recipient of the confidential balance
     * @param amount Cleartext ERC20 amount to wrap
     */
    function wrap(address to, uint256 amount) public override {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!kyc.isKycApproved(to)) revert NotKycApproved(to);
        super.wrap(to, amount);
    }

    /**
     * @notice Request an unwrap from confidential to public ERC20 (KYC-gated)
     * @dev Burns the confidential amount and emits a handle that must be publicly decrypted and finalized.
     * @param from Address whose confidential balance is burned
     * @param to Recipient of the public ERC20
     * @param amount Encrypted amount (handle)
     */
    function unwrap(address from, address to, euint64 amount) public override {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!kyc.isKycApproved(from)) revert NotKycApproved(from);
        if (!kyc.isKycApproved(to)) revert NotKycApproved(to);
        super.unwrap(from, to, amount);
    }

    /**
     * @notice Request an unwrap from confidential to public ERC20 via encrypted input (KYC-gated)
     * @dev Convenience overload: converts external input to `euint64` then calls the handle-based unwrap.
     * @param from Address whose confidential balance is burned
     * @param to Recipient of the public ERC20
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function unwrap(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public override {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!kyc.isKycApproved(from)) revert NotKycApproved(from);
        if (!kyc.isKycApproved(to)) revert NotKycApproved(to);
        super.unwrap(from, to, encryptedAmount, inputProof);
    }
}
