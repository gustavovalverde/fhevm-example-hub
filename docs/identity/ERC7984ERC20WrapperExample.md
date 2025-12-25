# ERC7984ERC20WrapperExample

> **Category**: Identity | **Difficulty**: Advanced | **Chapters**: Erc7984 | **Concept**: ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap

Wrap a public ERC20 into a confidential ERC7984 token, and unwrap back via public decryption

## Why this example

This example focuses on **ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/ERC7984ERC20WrapperExample.test.ts
```

## Dependencies

- SimpleKycRegistry
- MockUSDC

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | SimpleKycRegistry | $deployer | kyc |
| 2 | MockUSDC | $deployer, 0 | usdc |
| 3 | ERC7984ERC20WrapperExample | $deployer, @usdc, @kyc | wrapper |


## Contract and test

{% tabs %}

{% tab title="ERC7984ERC20WrapperExample.sol" %}


```solidity
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
```

{% endtab %}

{% tab title="ERC7984ERC20WrapperExample.test.ts" %}


```typescript
/**
 * @title ERC7984ERC20WrapperExample Tests
 * @notice Tests ERC20 ↔ ERC7984 wrapping with public decryption finalization
 * @dev Includes KYC gating and common pitfalls (public decrypt not available unless published)
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984ERC20WrapperExample", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let usdc: Awaited<ReturnType<typeof deployUSDC>>;
  let wrapper: Awaited<ReturnType<typeof deployWrapper>>;

  let kycAddress: string;
  let usdcAddress: string;
  let wrapperAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  async function deployKyc() {
    const factory = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployUSDC() {
    const factory = await hre.ethers.getContractFactory("MockUSDC");
    const contract = await factory.deploy(alice.address, 2_000_000);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployWrapper() {
    const factory = await hre.ethers.getContractFactory("ERC7984ERC20WrapperExample");
    const contract = await factory.deploy(owner.address, usdcAddress, kycAddress);
    await contract.waitForDeployment();
    return contract;
  }

  async function decryptWrapperBalance(holder: HardhatEthersSigner) {
    const handle = await wrapper.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, wrapperAddress, holder);
  }

  function findUnwrapAmountHandle(receipt: any) {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== wrapperAddress.toLowerCase()) continue;
      try {
        const parsed = wrapper.interface.parseLog(log);
        if (parsed?.name !== "UnwrapRequested") continue;
        const [, amount] = parsed.args;
        return amount as string;
      } catch {
        // ignore
      }
    }
    throw new Error("UnwrapRequested event not found");
  }

  before(async () => {
    [owner, alice, bob, carol] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    kycAddress = await kyc.getAddress();

    usdc = await deployUSDC();
    usdcAddress = await usdc.getAddress();

    wrapper = await deployWrapper();
    wrapperAddress = await wrapper.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(wrapper, "ERC7984ERC20WrapperExample");

    await kyc.connect(owner).setKyc(alice.address, true);
    await kyc.connect(owner).setKyc(bob.address, true);
  });

  it("should reject wrapping for non-KYC users (pitfall)", async () => {
    await expect(wrapper.connect(carol).wrap(carol.address, 1)).to.be.reverted;
  });

  it("should allow wrap for KYC users and mint confidential balance", async () => {
    await usdc.connect(alice).approve(wrapperAddress, 1_000_000);
    await wrapper.connect(alice).wrap(alice.address, 1_000_000);

    const bal = await decryptWrapperBalance(alice);
    expect(bal).to.equal(1_000_000n);
  });

  it("should not allow public decrypt of confidential balances (pitfall)", async () => {
    const handle = await wrapper.confidentialBalanceOf(alice.address);

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([handle]);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("should unwrap via public decryption finalization", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(400_000);
    const input = await encrypted.encrypt();

    const tx = await wrapper
      .connect(alice)
      ["unwrap(address,address,bytes32,bytes)"](
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof,
      );
    const receipt = await tx.wait();

    const burntAmountHandle = findUnwrapAmountHandle(receipt);
    const decrypted = await hre.fhevm.publicDecrypt([burntAmountHandle]);
    const clear = decrypted.clearValues[burntAmountHandle as `0x${string}`] as bigint;

    await wrapper.finalizeUnwrap(burntAmountHandle, Number(clear), decrypted.decryptionProof);

    expect(await usdc.balanceOf(bob.address)).to.equal(400_000n);
  });

  it("should revert finalization if the cleartext doesn't match the proof (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    const tx = await wrapper
      .connect(alice)
      ["unwrap(address,address,bytes32,bytes)"](
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof,
      );
    const receipt = await tx.wait();

    const burntAmountHandle = findUnwrapAmountHandle(receipt);
    const decrypted = await hre.fhevm.publicDecrypt([burntAmountHandle]);
    const clear = decrypted.clearValues[burntAmountHandle as `0x${string}`] as bigint;

    await expect(
      wrapper.finalizeUnwrap(burntAmountHandle, Number(clear + 1n), decrypted.decryptionProof),
    ).to.be.reverted;
  });

  it("should reject unwrap to non-KYC recipients", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      wrapper
        .connect(alice)
        ["unwrap(address,address,bytes32,bytes)"](
          alice.address,
          carol.address,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should reject wrapping for non-KYC users
- should not allow public decrypt of confidential balances

## API Reference

## Overview

Wrap a public ERC20 into a confidential ERC7984 token, and unwrap back via public decryption

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### NotKycApproved

```solidity
error NotKycApproved(address account)
```

Error thrown when a non-KYC-approved address attempts an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address that was not KYC-approved |

### constructor

```solidity
constructor(address initialOwner, contract IERC20 underlying_, contract SimpleKycRegistry kyc_) public
```

Initializes the wrapper with underlying token and KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |
| underlying_ | contract IERC20 | The ERC20 token to wrap |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract |

### wrap

```solidity
function wrap(address to, uint256 amount) public
```

Wrap ERC20 into confidential ERC7984 balance (KYC-gated)

_Reverts if caller or recipient is not KYC-approved._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient of the confidential balance |
| amount | uint256 | Cleartext ERC20 amount to wrap |

### unwrap

```solidity
function unwrap(address from, address to, euint64 amount) public
```

Request an unwrap from confidential to public ERC20 (KYC-gated)

_Burns the confidential amount and emits a handle that must be publicly decrypted and finalized._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address whose confidential balance is burned |
| to | address | Recipient of the public ERC20 |
| amount | euint64 | Encrypted amount (handle) |

### unwrap

```solidity
function unwrap(address from, address to, externalEuint64 encryptedAmount, bytes inputProof) public
```

Request an unwrap from confidential to public ERC20 via encrypted input (KYC-gated)

_Convenience overload: converts external input to `euint64` then calls the handle-based unwrap._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address whose confidential balance is burned |
| to | address | Recipient of the public ERC20 |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |
