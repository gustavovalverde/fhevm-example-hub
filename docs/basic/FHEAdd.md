# FHEAdd

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Arithmetic | **Concept**: Add two encrypted values with FHE.add

> 📚 [View API Reference](../reference/basic/FHEAdd.md)

Encrypted addition example for two values.

## Why this example

This example focuses on **Add two encrypted values with FHE.add**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/FHEAdd.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="FHEAdd.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEAdd
 * @author Gustavo Valverde
 * @notice Encrypted addition example for two values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter arithmetic
 * @custom:concept Add two encrypted values with FHE.add
 * @custom:difficulty beginner
 */
contract FHEAdd is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Returns the last encrypted sum.
    /// @return The last encrypted sum
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Add two encrypted inputs and store the encrypted result.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function addValues(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.add(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
```

{% endtab %}

{% tab title="FHEAdd.test.ts" %}


```typescript
/**
 * @title FHEAdd Tests
 * @notice Tests for encrypted addition
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEAdd", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHEAdd");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHEAdd");
  });

  it("adds two encrypted values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(12);
    encrypted.add64(30);
    const input = await encrypted.encrypt();

    await contract.connect(user).addValues(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      user,
    );

    expect(clear).to.equal(42n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
