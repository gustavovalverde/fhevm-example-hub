# FHECounter

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Basics | **Concept**: Encrypted counter using FHE.add and FHE.sub

Encrypted counter with increment and decrement operations.

## Why this example

This example focuses on **Encrypted counter using FHE.add and FHE.sub**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/FHECounter.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="FHECounter.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHECounter
 * @author Gustavo Valverde
 * @notice Encrypted counter with increment and decrement operations.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter basics
 * @custom:concept Encrypted counter using FHE.add and FHE.sub
 * @custom:difficulty beginner
 */
contract FHECounter is ZamaEthereumConfig {
    euint64 private count;

    /// @notice Returns the encrypted counter value.
    /// @return The encrypted counter value
    function getCount() external view returns (euint64) {
        return count;
    }

    /// @notice Increment the counter by an encrypted amount.
    /// @param encAmount Encrypted amount handle
    /// @param inputProof Proof for the encrypted input
    function increment(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        count = FHE.add(count, amount);
        FHE.allowThis(count);
        FHE.allow(count, msg.sender);
    }

    /// @notice Decrement the counter by an encrypted amount.
    /// @param encAmount Encrypted amount handle
    /// @param inputProof Proof for the encrypted input
    function decrement(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        count = FHE.sub(count, amount);
        FHE.allowThis(count);
        FHE.allow(count, msg.sender);
    }
}
```

{% endtab %}

{% tab title="FHECounter.test.ts" %}


```typescript
/**
 * @title FHECounter Tests
 * @notice Tests for the encrypted counter example
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHECounter", () => {
  let counter: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHECounter");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    counter = await deployContract();
    contractAddress = await counter.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(counter, "FHECounter");
  });

  it("increments the counter", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(5);
    const input = await encrypted.encrypt();

    await counter.connect(user).increment(input.handles[0], input.inputProof);

    const encryptedCount = await counter.getCount();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedCount,
      contractAddress,
      user,
    );

    expect(clear).to.equal(5n);
  });

  it("decrements the counter", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    await counter.connect(user).increment(input.handles[0], input.inputProof);
    await counter.connect(user).decrement(input.handles[0], input.inputProof);

    const encryptedCount = await counter.getCount();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedCount,
      contractAddress,
      user,
    );

    expect(clear).to.equal(0n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
