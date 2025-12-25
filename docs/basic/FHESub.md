# FHESub

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Arithmetic | **Concept**: Subtract two encrypted values with FHE.sub

> 📚 [View API Reference](../reference/basic/FHESub.md)

Encrypted subtraction example for two values.

## Why this example

This example focuses on **Subtract two encrypted values with FHE.sub**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/FHESub.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="FHESub.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHESub
 * @author Gustavo Valverde
 * @notice Encrypted subtraction example for two values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Subtract two encrypted values with FHE.sub
 * @custom:difficulty beginner
 */
contract FHESub is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Returns the last encrypted difference.
    /// @return The last encrypted difference
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Subtract two encrypted inputs (a - b) and store the encrypted result.
    /// @param encA First encrypted value handle (minuend)
    /// @param encB Second encrypted value handle (subtrahend)
    /// @param inputProof Proof for the encrypted inputs
    function subValues(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.sub(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
```

{% endtab %}

{% tab title="FHESub.test.ts" %}


```typescript
/**
 * @title FHESub Tests
 * @notice Tests for encrypted subtraction
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHESub", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHESub");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHESub");
  });

  it("subtracts two encrypted values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(100);
    encrypted.add64(58);
    const input = await encrypted.encrypt();

    await contract.connect(user).subValues(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      user,
    );

    expect(clear).to.equal(42n);
  });

  it("handles subtraction resulting in zero", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(50);
    encrypted.add64(50);
    const input = await encrypted.encrypt();

    await contract.connect(user).subValues(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
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
