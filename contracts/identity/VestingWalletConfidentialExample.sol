// SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
// Rationale: Factory/Clone pattern - KycVestingWalletConfidential and its factory form a single
// deployable unit. The factory instantiates the implementation; they're not used independently.
pragma solidity ^0.8.27;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig, ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
// solhint-disable-next-line max-line-length
import {VestingWalletConfidential} from "@openzeppelin/confidential-contracts/finance/VestingWalletConfidential.sol";
// solhint-disable-next-line max-line-length
import {VestingWalletConfidentialFactory} from "@openzeppelin/confidential-contracts/finance/VestingWalletConfidentialFactory.sol";
import {SimpleKycRegistry} from "./helpers/SimpleKycRegistry.sol";

// solhint-disable max-line-length
/**
 * @title VestingWalletConfidentialExample
 * @author Gustavo Valverde
 * @notice Confidential vesting wallet with public KYC gating on releases
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984,vesting
 * @custom:concept Confidential vesting (ERC7984) + public KYC gating + factory/clones
 * @custom:difficulty advanced
 * @custom:depends-on SimpleKycRegistry,MintableConfidentialToken
 * @custom:deploy-plan [{"contract":"SimpleKycRegistry","saveAs":"kyc","args":["$deployer"]},{"contract":"MintableConfidentialToken","saveAs":"token","args":["$deployer","Vesting Confidential Token","vCONF","ipfs://vesting-token"]},{"contract":"VestingWalletConfidentialExampleFactory","saveAs":"vestingFactory","args":["@kyc"]}]
 *
 * Production alignment:
 * - Tokenized credentials/rewards may vest over time and only be claimable by verified recipients.
 * - KYC status is public in this scenario: releases revert if beneficiary is not KYC-approved.
 *
 * Key patterns:
 * - `VestingWalletConfidential` computes releasable amounts on encrypted balances.
 * - `release()` uses `FHE.allowTransient(amount, token)` to let the token consume the computed handle.
 * - A factory deploys a single implementation and creates deterministic clones.
 */
// solhint-enable max-line-length

/**
 * @title KycVestingWalletConfidential
 * @author Gustavo Valverde
 * @notice Confidential vesting wallet with KYC-gated releases
 * @dev Clone-compatible implementation using initializer pattern
 */
contract KycVestingWalletConfidential is VestingWalletConfidential, ZamaEthereumConfig {
    /// @notice The KYC registry for compliance checks
    SimpleKycRegistry public kyc;

    /// @notice Error thrown when a non-KYC-approved beneficiary attempts to release
    /// @param beneficiary The address that was not KYC-approved
    error NotKycApproved(address beneficiary);

    /// @notice Initializes the implementation contract and disables further initialization
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize clone state (clones-safe initializer)
     * @dev Clones do not run constructors; this configures coprocessor and VestingWallet state.
     * @param kyc_ Public KYC registry
     * @param beneficiary Address that can release vested tokens
     * @param startTimestamp Vesting start time (unix seconds)
     * @param durationSeconds Vesting duration in seconds
     */
    function initialize(SimpleKycRegistry kyc_, address beneficiary, uint48 startTimestamp, uint48 durationSeconds)
        public
        initializer
    {
        kyc = kyc_;
        __VestingWalletConfidential_init(beneficiary, startTimestamp, durationSeconds);

        // Clones do not run constructors; configure coprocessor on initialize.
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
    }

    /**
     * @notice Release vested tokens to the beneficiary (KYC-gated)
     * @dev Reverts if beneficiary is not KYC-approved in the public registry.
     * @param token ERC7984 token address
     */
    function release(address token) public override {
        address beneficiary = owner();
        if (!kyc.isKycApproved(beneficiary)) revert NotKycApproved(beneficiary);
        super.release(token);
    }
}

/**
 * @title VestingWalletConfidentialExampleFactory
 * @author Gustavo Valverde
 * @notice Factory for deploying KYC-gated confidential vesting wallets as clones
 * @dev Uses clone pattern for gas-efficient deployment
 */
contract VestingWalletConfidentialExampleFactory is VestingWalletConfidentialFactory, ZamaEthereumConfig {
    /// @notice Error thrown when beneficiary is the zero address
    error InvalidBeneficiary();

    /// @notice The KYC registry used for all deployed vesting wallets
    SimpleKycRegistry public immutable kyc;

    /**
     * @notice Initializes the factory with a KYC registry
     * @param kyc_ The KYC registry contract for compliance checks
     */
    constructor(SimpleKycRegistry kyc_) {
        kyc = kyc_;
    }

    /// @notice Deploys the vesting wallet implementation contract
    /// @return The address of the deployed implementation
    function _deployVestingWalletImplementation() internal override returns (address) {
        return address(new KycVestingWalletConfidential());
    }

    /// @notice Validates the initialization arguments for a new vesting wallet
    /// @param initArgs ABI-encoded (beneficiary, startTimestamp, durationSeconds)
    function _validateVestingWalletInitArgs(bytes memory initArgs) internal pure override {
        // solhint-disable-next-line no-unused-vars
        (address beneficiary, uint48 startTimestamp, uint48 durationSeconds) =
            abi.decode(initArgs, (address, uint48, uint48));
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        // durationSeconds can be 0 (timelock-style)
        // startTimestamp can be 0 (fully vested at any real timestamp)
        // Silence unused variable warnings
        (startTimestamp, durationSeconds);
    }

    /**
     * @notice Initializes a newly cloned vesting wallet
     * @param vestingWalletAddress The address of the cloned vesting wallet
     * @param initArgs ABI-encoded (beneficiary, startTimestamp, durationSeconds)
     */
    function _initializeVestingWallet(address vestingWalletAddress, bytes calldata initArgs) internal override {
        (address beneficiary, uint48 startTimestamp, uint48 durationSeconds) =
            abi.decode(initArgs, (address, uint48, uint48));
        KycVestingWalletConfidential(vestingWalletAddress).initialize(
            kyc, beneficiary, startTimestamp, durationSeconds
        );
    }
}
