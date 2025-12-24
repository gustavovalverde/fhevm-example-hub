# TransientAccessControl

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Access Control | **Concept**: FHE.allowTransient() for one-transaction permissions between contracts

Demonstrates `FHE.allowTransient()` for cross-contract encrypted workflows

## Why this example

This example focuses on **FHE.allowTransient() for one-transaction permissions between contracts**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/TransientAccessControl.test.ts
```

## Dependencies

None

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | TransientAccessRegistry | - | registry |
| 2 | TransientScoreConsumer | - | consumer |


## Contract and test

{% tabs %}

{% tab title="TransientAccessControl.sol" %}


```solidity
// SPDX-License-Identifier: MIT
/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// solhint-disable max-line-length
/**
 * @title TransientAccessControl
 * @author Gustavo Valverde
 * @notice Demonstrates `FHE.allowTransient()` for cross-contract encrypted workflows
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter access-control
 * @custom:concept FHE.allowTransient() for one-transaction permissions between contracts
 * @custom:difficulty intermediate
 * @custom:deploy-plan [{"contract":"TransientAccessRegistry","saveAs":"registry"},{"contract":"TransientScoreConsumer","saveAs":"consumer"}]
 *
 * In real-world identity systems, you often split responsibilities:
 * - A registry stores encrypted attributes (KYC level, liveness score, etc.)
 * - A consumer contract (token, compliance rules, dApp) computes on that data
 *
 * The consumer must be allowed to operate on the encrypted handles it receives.
 * `FHE.allowTransient()` is a practical pattern for granting that permission
 * only for the current transaction (least privilege).
 *
 * This file contains two contracts:
 * - `TransientAccessRegistry` stores an encrypted score per user.
 * - `TransientScoreConsumer` reads the score and performs an encrypted comparison.
 */
// solhint-enable max-line-length
/**
 * @title TransientAccessRegistry
 * @author Gustavo Valverde
 * @notice Registry that stores encrypted scores and grants transient permissions
 * @dev Demonstrates how to grant transient permissions to calling contracts
 * @custom:category identity
 * @custom:concept FHE.allowTransient() for one-transaction permissions between contracts
 * @custom:difficulty intermediate
 */
contract TransientAccessRegistry is ZamaEthereumConfig {
    /// @notice Encrypted score per user (e.g., KYC level, liveness score bucket, etc.)
    mapping(address user => euint8 score) private scores;

    /// @notice Emitted when a user stores their encrypted score
    /// @param user The address that stored a score
    event ScoreStored(address indexed user);

    /// @notice Error thrown when a user has no stored score
    error NoScore();

    /**
     * @notice Store an encrypted score for msg.sender
     * @param encryptedScore Encrypted score (0-255)
     * @param inputProof Proof for the encrypted input
     */
    function storeScore(externalEuint8 encryptedScore, bytes calldata inputProof) external {
        euint8 score = FHE.fromExternal(encryptedScore, inputProof);
        scores[msg.sender] = score;

        // Contract needs permission to operate later; user needs permission to decrypt.
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);

        emit ScoreStored(msg.sender);
    }

    /**
     * @notice Return a user's encrypted score AND grant the caller transient permission
     * @dev This must NOT be `view`, because it mutates transient ACL state.
     * @param user The score owner
     * @return The user's encrypted score
     */
    function getScoreFor(address user) external returns (euint8) {
        euint8 score = scores[user];
        if (!FHE.isInitialized(score)) revert NoScore();

        // Key idea: allow the calling contract to operate on this handle only in this tx.
        FHE.allowTransient(score, msg.sender);

        return score;
    }

    /**
     * @notice Return a user's encrypted score WITHOUT granting transient permission (pitfall)
     * @dev Consumers that try to compute on the returned handle will revert.
     * @param user The score owner
     * @return The user's encrypted score (without transient permission)
     */
    function getScoreNoTransient(address user) external view returns (euint8) {
        euint8 score = scores[user];
        if (!FHE.isInitialized(score)) revert NoScore();
        return score;
    }
}

/**
 * @title TransientScoreConsumer
 * @author Gustavo Valverde
 * @notice Consumer contract that demonstrates using transient permissions to access encrypted data
 * @dev Shows both correct usage and common pitfalls when working with transient permissions
 */
contract TransientScoreConsumer is ZamaEthereumConfig {
    /// @notice Cached score handle (demonstrates that handles can outlive transient permissions)
    euint8 private cachedScore;

    /// @notice Store last encrypted result per caller (for testing / retrieval)
    mapping(address caller => ebool result) private lastResults;

    /// @notice Error thrown when attempting to use a cached score that doesn't exist
    error NoCachedScore();

    /// @notice Error thrown when attempting to retrieve a result that doesn't exist
    error NoResult();

    /**
     * @notice Compare a user's score against a plaintext threshold (works with `allowTransient`)
     * @param registry Registry contract address
     * @param user Score owner
     * @param minScore Minimum required score (plaintext)
     * @return Encrypted boolean result
     */
    function checkAtLeastWithTransient(
        address registry,
        address user,
        uint8 minScore
    ) external returns (ebool) {
        euint8 score = TransientAccessRegistry(registry).getScoreFor(user);
        ebool ok = FHE.ge(score, FHE.asEuint8(minScore));

        FHE.allowThis(ok);
        FHE.allow(ok, msg.sender);
        lastResults[msg.sender] = ok;
        return ok;
    }

    /**
     * @notice Same comparison but using a registry call that does NOT grant transient permission (pitfall)
     * @param registry Registry contract address
     * @param user Score owner
     * @param minScore Minimum required score (plaintext)
     * @return Encrypted boolean result (will fail without transient permission)
     */
    function checkAtLeastWithoutTransient(
        address registry,
        address user,
        uint8 minScore
    ) external returns (ebool) {
        euint8 score = TransientAccessRegistry(registry).getScoreNoTransient(user);
        ebool ok = FHE.ge(score, FHE.asEuint8(minScore));

        FHE.allowThis(ok);
        FHE.allow(ok, msg.sender);
        lastResults[msg.sender] = ok;
        return ok;
    }

    /**
     * @notice Cache a user's score handle (works because reading doesn't require permission)
     * @dev The cached handle will NOT be usable in later txs unless permanently allowed.
     * @param registry Registry contract address
     * @param user Score owner
     */
    function cacheScoreWithTransient(address registry, address user) external {
        cachedScore = TransientAccessRegistry(registry).getScoreFor(user);
    }

    /**
     * @notice Attempt to reuse a cached handle in a later transaction (pitfall)
     * @param minScore Minimum required score (plaintext)
     * @return Encrypted boolean result (will revert without permanent permission)
     */
    function useCachedScore(uint8 minScore) external returns (ebool) {
        if (!FHE.isInitialized(cachedScore)) revert NoCachedScore();

        // This will revert unless the registry permanently allowed this contract.
        ebool ok = FHE.ge(cachedScore, FHE.asEuint8(minScore));
        FHE.allowThis(ok);
        FHE.allow(ok, msg.sender);
        lastResults[msg.sender] = ok;
        return ok;
    }

    /**
     * @notice Get the last computed result for a caller
     * @dev Call `checkAtLeastWithTransient` first.
     * @param caller The address to get the result for
     * @return The last computed encrypted boolean result
     */
    function getLastResult(address caller) external view returns (ebool) {
        ebool result = lastResults[caller];
        if (!FHE.isInitialized(result)) revert NoResult();
        return result;
    }
}
```

{% endtab %}

{% tab title="TransientAccessControl.test.ts" %}


```typescript
/**
 * @title TransientAccessControl Tests
 * @notice Tests for `FHE.allowTransient()` cross-contract patterns
 * @dev Demonstrates both the correct flow and common pitfalls
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("TransientAccessControl", () => {
  let registry: Awaited<ReturnType<typeof deployRegistry>>;
  let consumer: Awaited<ReturnType<typeof deployConsumer>>;
  let registryAddress: string;
  let consumerAddress: string;

  let user: HardhatEthersSigner;

  async function deployRegistry() {
    const factory = await hre.ethers.getContractFactory("TransientAccessRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  async function deployConsumer() {
    const factory = await hre.ethers.getContractFactory("TransientScoreConsumer");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();

    registry = await deployRegistry();
    consumer = await deployConsumer();

    registryAddress = await registry.getAddress();
    consumerAddress = await consumer.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(registry, "TransientAccessRegistry");
    await hre.fhevm.assertCoprocessorInitialized(consumer, "TransientScoreConsumer");
  });

  async function storeScore(score: number) {
    const encrypted = hre.fhevm.createEncryptedInput(registryAddress, user.address);
    encrypted.add8(score);
    const encryptedInput = await encrypted.encrypt();

    await registry.connect(user).storeScore(encryptedInput.handles[0], encryptedInput.inputProof);
  }

  it("should allow a consumer contract to compute when the registry uses allowTransient", async () => {
    await storeScore(80);

    await consumer.connect(user).checkAtLeastWithTransient(registryAddress, user.address, 50);

    const encryptedOk = await consumer.getLastResult(user.address);

    const ok = await hre.fhevm.userDecryptEbool(encryptedOk, consumerAddress, user);
    expect(ok).to.equal(true);
  });

  it("should revert when the registry does not grant transient permission (pitfall)", async () => {
    await storeScore(80);

    await expect(
      consumer.connect(user).checkAtLeastWithoutTransient(registryAddress, user.address, 50),
    ).to.be.reverted;
  });

  it("should show that cached handles outlive transient permissions (pitfall)", async () => {
    await storeScore(80);

    // This call succeeds because the registry grants transient permission within this tx.
    await consumer.connect(user).cacheScoreWithTransient(registryAddress, user.address);

    // In a new tx, the consumer no longer has permission on the cached handle.
    await expect(consumer.connect(user).useCachedScore(50)).to.be.reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should revert when the registry does not grant transient permission
- should show that cached handles outlive transient permissions
