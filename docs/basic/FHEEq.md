# FHEEq

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Comparisons | **Concept**: Compare two encrypted values using FHE.eq

Encrypted equality comparison with FHE.eq.

## Why this example

This example focuses on **Compare two encrypted values using FHE.eq**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/FHEEq.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="FHEEq.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEEq
 * @author Gustavo Valverde
 * @notice Encrypted equality comparison with FHE.eq.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter comparisons
 * @custom:concept Compare two encrypted values using FHE.eq
 * @custom:difficulty beginner
 */
contract FHEEq is ZamaEthereumConfig {
    ebool private lastResult;

    /// @notice Returns the last encrypted comparison result.
    /// @return The last encrypted comparison result
    function getLastResult() external view returns (ebool) {
        return lastResult;
    }

    /// @notice Compare two encrypted inputs and store the encrypted result.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function compare(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);
        lastResult = FHE.eq(a, b);
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
```

{% endtab %}

{% tab title="FHEEq.test.ts" %}


```typescript
/**
 * @title FHEEq Tests
 * @notice Tests for encrypted equality comparisons
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEEq", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHEEq");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHEEq");
  });

  it("returns true for equal values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(7);
    encrypted.add64(7);
    const input = await encrypted.encrypt();

    await contract.connect(user).compare(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user);
    expect(clear).to.equal(true);
  });

  it("returns false for different values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(7);
    encrypted.add64(9);
    const input = await encrypted.encrypt();

    await contract.connect(user).compare(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user);
    expect(clear).to.equal(false);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
