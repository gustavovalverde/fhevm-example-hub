# UserDecryptMultipleValues

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Decryption User | **Concept**: User decryption flow for multiple encrypted results

> 📚 [View API Reference](../reference/basic/UserDecryptMultipleValues.md)

Produce multiple encrypted outputs and allow the user to decrypt both.

## Why this example

This example focuses on **User decryption flow for multiple encrypted results**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/UserDecryptMultipleValues.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="UserDecryptMultipleValues.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptMultipleValues
 * @author Gustavo Valverde
 * @notice Produce multiple encrypted outputs and allow the user to decrypt both.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-user
 * @custom:concept User decryption flow for multiple encrypted results
 * @custom:difficulty beginner
 */
contract UserDecryptMultipleValues is ZamaEthereumConfig {
    euint64 private lastSum;
    euint64 private lastDifference;

    /// @notice Returns the last encrypted sum.
    /// @return The last encrypted sum
    function getLastSum() external view returns (euint64) {
        return lastSum;
    }

    /// @notice Returns the last encrypted difference.
    /// @return The last encrypted difference
    function getLastDifference() external view returns (euint64) {
        return lastDifference;
    }

    /// @notice Compute sum and difference for two encrypted inputs.
    /// @param encA First encrypted value handle
    /// @param encB Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function computeSumAndDifference(
        externalEuint64 encA,
        externalEuint64 encB,
        bytes calldata inputProof
    ) external {
        euint64 a = FHE.fromExternal(encA, inputProof);
        euint64 b = FHE.fromExternal(encB, inputProof);

        lastSum = FHE.add(a, b);
        lastDifference = FHE.sub(a, b);

        FHE.allowThis(lastSum);
        FHE.allowThis(lastDifference);
        FHE.allow(lastSum, msg.sender);
        FHE.allow(lastDifference, msg.sender);
    }
}
```

{% endtab %}

{% tab title="UserDecryptMultipleValues.test.ts" %}


```typescript
/**
 * @title UserDecryptMultipleValues Tests
 * @notice Tests for decrypting multiple encrypted results
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("UserDecryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("UserDecryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "UserDecryptMultipleValues");
  });

  it("returns encrypted sum and difference", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(50);
    encrypted.add64(8);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .computeSumAndDifference(input.handles[0], input.handles[1], input.inputProof);

    const encryptedSum = await contract.getLastSum();
    const encryptedDiff = await contract.getLastDifference();

    const sum = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSum,
      contractAddress,
      user,
    );
    const diff = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedDiff,
      contractAddress,
      user,
    );

    expect(sum).to.equal(58n);
    expect(diff).to.equal(42n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
