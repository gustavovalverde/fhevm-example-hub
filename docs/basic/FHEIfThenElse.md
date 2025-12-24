# FHEIfThenElse

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Arithmetic | **Concept**: Conditional selection on encrypted values using FHE.select

Use FHE.select to implement an encrypted if/else branch.

## Why this example

This example focuses on **Conditional selection on encrypted values using FHE.select**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/FHEIfThenElse.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="FHEIfThenElse.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEIfThenElse
 * @author Gustavo Valverde
 * @notice Use FHE.select to implement an encrypted if/else branch.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Conditional selection on encrypted values using FHE.select
 * @custom:difficulty beginner
 */
contract FHEIfThenElse is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Return the last encrypted result.
    /// @return The last encrypted selection result.
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /**
     * @notice Pick between left/right depending on whether left <= threshold.
     * @dev All three encrypted inputs must be bound to the same proof.
     * @param left Encrypted left value
     * @param right Encrypted right value
     * @param threshold Encrypted threshold value
     * @param inputProof Proof for the encrypted inputs
     */
    function choose(
        externalEuint64 left,
        externalEuint64 right,
        externalEuint64 threshold,
        bytes calldata inputProof
    ) external {
        euint64 leftValue = FHE.fromExternal(left, inputProof);
        euint64 rightValue = FHE.fromExternal(right, inputProof);
        euint64 thresholdValue = FHE.fromExternal(threshold, inputProof);

        ebool takeLeft = FHE.le(leftValue, thresholdValue);
        lastResult = FHE.select(takeLeft, leftValue, rightValue);

        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
```

{% endtab %}

{% tab title="FHEIfThenElse.test.ts" %}


```typescript
/**
 * @title FHEIfThenElse Tests
 * @notice Tests encrypted conditional selection with FHE.select
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEIfThenElse", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHEIfThenElse");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    contract = await deployContract();
    contractAddress = await contract.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHEIfThenElse");
  });

  it("picks the left value when left <= threshold", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    encrypted.add64(99);
    encrypted.add64(20);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .choose(input.handles[0], input.handles[1], input.handles[2], input.inputProof);

    const result = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      result,
      contractAddress,
      user,
    );

    expect(clear).to.equal(10n);
  });

  it("picks the right value when left > threshold", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(42);
    encrypted.add64(7);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .choose(input.handles[0], input.handles[1], input.handles[2], input.inputProof);

    const result = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      result,
      contractAddress,
      user,
    );

    expect(clear).to.equal(7n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
