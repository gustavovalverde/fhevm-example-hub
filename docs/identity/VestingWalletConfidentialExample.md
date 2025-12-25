# VestingWalletConfidentialExample

> **Category**: Identity | **Difficulty**: Advanced | **Chapters**: Erc7984, Vesting | **Concept**: Confidential vesting (ERC7984) + public KYC gating + factory/clones

Confidential vesting wallet with public KYC gating on releases

## Why this example

This example focuses on **Confidential vesting (ERC7984) + public KYC gating + factory/clones**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/VestingWalletConfidentialExample.test.ts
```

## Dependencies

- SimpleKycRegistry
- MintableConfidentialToken

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | SimpleKycRegistry | $deployer | kyc |
| 2 | MintableConfidentialToken | $deployer, "Vesting Confidential Token", "vCONF", "ipfs://vesting-token" | token |
| 3 | VestingWalletConfidentialExampleFactory | @kyc | vestingFactory |


## Contract and test

{% tabs %}

{% tab title="VestingWalletConfidentialExample.sol" %}


```solidity
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
```

{% endtab %}

{% tab title="VestingWalletConfidentialExample.test.ts" %}


```typescript
/**
 * @title VestingWalletConfidentialExample Tests
 * @notice Tests confidential vesting wallet releases gated by public KYC
 * @dev Uses factory + clones (recommended pattern)
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("VestingWalletConfidentialExample", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let token: Awaited<ReturnType<typeof deployToken>>;
  let factory: Awaited<ReturnType<typeof deployFactory>>;

  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;

  async function deployKyc() {
    const f = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const c = await f.deploy(owner.address);
    await c.waitForDeployment();
    return c;
  }

  async function deployToken() {
    const f = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const c = await f.deploy(
      owner.address,
      "Vesting Confidential Token",
      "vCONF",
      "ipfs://vesting-token",
    );
    await c.waitForDeployment();
    return c;
  }

  async function deployFactory() {
    const f = await hre.ethers.getContractFactory("VestingWalletConfidentialExampleFactory");
    const c = await f.deploy(await kyc.getAddress());
    await c.waitForDeployment();
    return c;
  }

  async function mintTo(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(holder: HardhatEthersSigner) {
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, holder);
  }

  before(async () => {
    [owner, beneficiary] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    token = await deployToken();
    tokenAddress = await token.getAddress();
    factory = await deployFactory();

    await hre.fhevm.assertCoprocessorInitialized(token, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(
      factory,
      "VestingWalletConfidentialExampleFactory",
    );
  });

  it("should create a vesting wallet clone", async () => {
    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 0],
    );

    const predicted = await factory.predictVestingWalletConfidential(initArgs);
    const tx = await factory.createVestingWalletConfidential(initArgs);
    await tx.wait();

    expect(predicted).to.not.equal("0x0000000000000000000000000000000000000000");
  });

  it("should block releases when beneficiary is not KYC-approved", async () => {
    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 1],
    );
    const walletAddress = await factory.createVestingWalletConfidential.staticCall(initArgs);
    await (await factory.createVestingWalletConfidential(initArgs)).wait();

    await mintTo(walletAddress, 100_000);

    const wallet = await hre.ethers.getContractAt("KycVestingWalletConfidential", walletAddress);

    await expect(wallet.release(tokenAddress)).to.be.reverted;
  });

  it("should allow releases after KYC approval", async () => {
    await kyc.connect(owner).setKyc(beneficiary.address, true);

    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 2],
    );
    const walletAddress = await factory.createVestingWalletConfidential.staticCall(initArgs);
    await (await factory.createVestingWalletConfidential(initArgs)).wait();

    await mintTo(walletAddress, 200_000);

    const wallet = await hre.ethers.getContractAt("KycVestingWalletConfidential", walletAddress);
    await wallet.release(tokenAddress);

    const bal = await decryptBalance(beneficiary);
    expect(bal).to.equal(200_000n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Confidential vesting wallet with KYC-gated releases

### Developer Notes

Clone-compatible implementation using initializer pattern

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### NotKycApproved

```solidity
error NotKycApproved(address beneficiary)
```

Error thrown when a non-KYC-approved beneficiary attempts to release

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | The address that was not KYC-approved |

### constructor

```solidity
constructor() public
```

Initializes the implementation contract and disables further initialization

### initialize

```solidity
function initialize(contract SimpleKycRegistry kyc_, address beneficiary, uint48 startTimestamp, uint48 durationSeconds) public
```

Initialize clone state (clones-safe initializer)

_Clones do not run constructors; this configures coprocessor and VestingWallet state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kyc_ | contract SimpleKycRegistry | Public KYC registry |
| beneficiary | address | Address that can release vested tokens |
| startTimestamp | uint48 | Vesting start time (unix seconds) |
| durationSeconds | uint48 | Vesting duration in seconds |

### release

```solidity
function release(address token) public
```

Release vested tokens to the beneficiary (KYC-gated)

_Reverts if beneficiary is not KYC-approved in the public registry._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | ERC7984 token address |

# VestingWalletConfidentialExampleFactory

## Overview

Factory for deploying KYC-gated confidential vesting wallets as clones

### Developer Notes

Uses clone pattern for gas-efficient deployment

### InvalidBeneficiary

```solidity
error InvalidBeneficiary()
```

Error thrown when beneficiary is the zero address

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry used for all deployed vesting wallets

### constructor

```solidity
constructor(contract SimpleKycRegistry kyc_) public
```

Initializes the factory with a KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract for compliance checks |

### _deployVestingWalletImplementation

```solidity
function _deployVestingWalletImplementation() internal returns (address)
```

Deploys the vesting wallet implementation contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the deployed implementation |

### _validateVestingWalletInitArgs

```solidity
function _validateVestingWalletInitArgs(bytes initArgs) internal pure
```

Validates the initialization arguments for a new vesting wallet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initArgs | bytes | ABI-encoded (beneficiary, startTimestamp, durationSeconds) |

### _initializeVestingWallet

```solidity
function _initializeVestingWallet(address vestingWalletAddress, bytes initArgs) internal
```

Initializes a newly cloned vesting wallet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingWalletAddress | address | The address of the cloned vesting wallet |
| initArgs | bytes | ABI-encoded (beneficiary, startTimestamp, durationSeconds) |
