# SwapERC7984ToERC20

> **Category**: Identity | **Difficulty**: Advanced | **Chapters**: Erc7984, Swaps | **Concept**: ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)

Swap a confidential ERC7984 token amount to a public ERC20 via public decryption finalization

## Why this example

This example focuses on **ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/SwapERC7984ToERC20.test.ts
```

## Dependencies

- SimpleKycRegistry
- MintableConfidentialToken
- MockERC20

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | SimpleKycRegistry | $deployer | kyc |
| 2 | MintableConfidentialToken | $deployer, "Mock Confidential Token", "mCONF", "ipfs://mintable-erc7984" | confidentialToken |
| 3 | MockERC20 | $deployer, 0 | erc20 |
| 4 | SwapERC7984ToERC20 | $deployer, @confidentialToken, @erc20, @kyc | swap |


## Contract and test

{% tabs %}

{% tab title="SwapERC7984ToERC20.sol" %}


```solidity
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
```

{% endtab %}

{% tab title="SwapERC7984ToERC20.test.ts" %}


```typescript
/**
 * @title SwapERC7984ToERC20 Tests
 * @notice Tests swapping confidential ERC7984 amounts to public ERC20 via public decryption
 * @dev Includes failure modes: missing operator, missing allowTransient, missing publish
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("SwapERC7984ToERC20", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let token: Awaited<ReturnType<typeof deployConfidentialToken>>;
  let erc20: Awaited<ReturnType<typeof deployERC20>>;
  let swap: Awaited<ReturnType<typeof deploySwap>>;

  let tokenAddress: string;
  let erc20Address: string;
  let swapAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployKyc() {
    const factory = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployConfidentialToken() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(
      owner.address,
      "Mock Confidential Token",
      "mCONF",
      "ipfs://mintable-erc7984",
    );
    await contract.waitForDeployment();
    return contract;
  }

  async function deployERC20() {
    const factory = await hre.ethers.getContractFactory("MockERC20");
    const contract = await factory.deploy(owner.address, 0);
    await contract.waitForDeployment();
    return contract;
  }

  async function deploySwap() {
    const factory = await hre.ethers.getContractFactory("SwapERC7984ToERC20");
    const contract = await factory.deploy(
      owner.address,
      tokenAddress,
      erc20Address,
      await kyc.getAddress(),
    );
    await contract.waitForDeployment();
    return contract;
  }

  async function mintConfidential(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  function findTransferHandle(receipt: any, from: string, to: string) {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
      try {
        const parsed = token.interface.parseLog(log);
        if (parsed?.name !== "ConfidentialTransfer") continue;
        const [evtFrom, evtTo, transferred] = parsed.args;
        if (evtFrom === from && evtTo === to) return transferred as string;
      } catch {
        // ignore
      }
    }
    throw new Error("ConfidentialTransfer event not found");
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    await kyc.connect(owner).setKyc(alice.address, true);

    token = await deployConfidentialToken();
    tokenAddress = await token.getAddress();

    erc20 = await deployERC20();
    erc20Address = await erc20.getAddress();

    swap = await deploySwap();
    swapAddress = await swap.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(swap, "SwapERC7984ToERC20");

    // Fund swap with ERC20 for payouts
    await erc20.connect(owner).mint(swapAddress, 1_000_000);

    await mintConfidential(alice.address, 500_000);
  });

  it("should revert swap if user is not KYC-approved", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, bob.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(bob).swapConfidentialToERC20(input.handles[0], input.inputProof)).to
      .be.reverted;
  });

  it("should revert swap if operator approval is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(alice).swapConfidentialToERC20(input.handles[0], input.inputProof)).to
      .be.reverted;
  });

  it("should swap and finalize with public decrypt proof", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    await token.connect(alice).setOperator(swapAddress, Number(now + 24n * 60n * 60n));

    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(123_456);
    const input = await encrypted.encrypt();

    const tx = await swap
      .connect(alice)
      .swapConfidentialToERC20(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);
    const decrypted = await hre.fhevm.publicDecrypt([transferredHandle]);
    const clear = decrypted.clearValues[transferredHandle as `0x${string}`] as bigint;

    await swap.finalizeSwap(transferredHandle, Number(clear), decrypted.decryptionProof);

    expect(await erc20.balanceOf(alice.address)).to.equal(clear);
  });

  it("should revert when omitting allowTransient for the token (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(alice).swapWithoutAllowingToken(input.handles[0], input.inputProof))
      .to.be.reverted;
  });

  it("should make finalization impossible if amountTransferred isn't published (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    const tx = await swap.connect(alice).swapWithoutPublishing(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([transferredHandle]);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("should reject finalization if the cleartext doesn't match the proof (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(3);
    const input = await encrypted.encrypt();

    const tx = await swap
      .connect(alice)
      .swapConfidentialToERC20(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);
    const decrypted = await hre.fhevm.publicDecrypt([transferredHandle]);
    const clear = decrypted.clearValues[transferredHandle as `0x${string}`] as bigint;

    await expect(
      swap.finalizeSwap(transferredHandle, Number(clear + 1n), decrypted.decryptionProof),
    ).to.be.reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should revert swap if operator approval is missing
- should revert when omitting allowTransient for the token

## API Reference

## Overview

Swap a confidential ERC7984 token amount to a public ERC20 via public decryption finalization

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### NotKycApproved

```solidity
error NotKycApproved(address account)
```

Error thrown when a non-KYC-approved address attempts an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address that was not KYC-approved |

### InvalidFinalization

```solidity
error InvalidFinalization(euint64 amount)
```

Error thrown when finalization is called with an invalid amount handle

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | euint64 | The invalid encrypted amount handle |

### fromToken

```solidity
contract IERC7984 fromToken
```

The confidential ERC7984 token to swap from

### toToken

```solidity
contract IERC20 toToken
```

The public ERC20 token to swap to

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### constructor

```solidity
constructor(address initialOwner, contract IERC7984 fromToken_, contract IERC20 toToken_, contract SimpleKycRegistry kyc_) public
```

Initializes the swap contract with token addresses and KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |
| fromToken_ | contract IERC7984 | The ERC7984 token to swap from |
| toToken_ | contract IERC20 | The ERC20 token to swap to |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract |

### swapConfidentialToERC20

```solidity
function swapConfidentialToERC20(externalEuint64 encryptedAmount, bytes inputProof) external
```

Swap confidential token amount to public ERC20 (two-step: request + finalize)

_Requires operator approval on the `fromToken` for this contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input (requested swap amount) |
| inputProof | bytes | Proof for the encrypted input Emits `ConfidentialTransfer` on the ERC7984 token; the transferred handle must be publicly decrypted off-chain, then finalized with `finalizeSwap`. |

### swapWithoutAllowingToken

```solidity
function swapWithoutAllowingToken(externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### swapWithoutPublishing

```solidity
function swapWithoutPublishing(externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.makePubliclyDecryptable(amountTransferred)` (finalization becomes impossible)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### finalizeSwap

```solidity
function finalizeSwap(euint64 amount, uint64 cleartextAmount, bytes decryptionProof) external
```

Finalize a swap using the public decryption proof from `FHE.publicDecrypt`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | euint64 | The encrypted handle that was published during `swapConfidentialToERC20` |
| cleartextAmount | uint64 | Decrypted cleartext amount matching `amount` |
| decryptionProof | bytes | KMS signature proof returned by the public decryption endpoint |
