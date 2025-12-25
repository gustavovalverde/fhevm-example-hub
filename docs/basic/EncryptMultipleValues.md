# EncryptMultipleValues

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Encryption | **Concept**: Store multiple encrypted values with a single proof

Store multiple encrypted values in one transaction.

## Why this example

This example focuses on **Store multiple encrypted values with a single proof**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/EncryptMultipleValues.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="EncryptMultipleValues.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptMultipleValues
 * @author Gustavo Valverde
 * @notice Store multiple encrypted values in one transaction.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter encryption
 * @custom:concept Store multiple encrypted values with a single proof
 * @custom:difficulty beginner
 */
contract EncryptMultipleValues is ZamaEthereumConfig {
    mapping(address user => euint64 first) private firstValues;
    mapping(address user => euint64 second) private secondValues;

    /// @notice Store two encrypted values for the sender.
    /// @param encFirst First encrypted value handle
    /// @param encSecond Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function storeValues(
        externalEuint64 encFirst,
        externalEuint64 encSecond,
        bytes calldata inputProof
    ) external {
        euint64 first = FHE.fromExternal(encFirst, inputProof);
        euint64 second = FHE.fromExternal(encSecond, inputProof);

        firstValues[msg.sender] = first;
        secondValues[msg.sender] = second;

        FHE.allowThis(first);
        FHE.allowThis(second);
        FHE.allow(first, msg.sender);
        FHE.allow(second, msg.sender);
    }

    /// @notice Retrieve both encrypted values for a user.
    /// @param user Account holding the encrypted values
    /// @return First encrypted value
    /// @return Second encrypted value
    function getValues(address user) external view returns (euint64, euint64) {
        return (firstValues[user], secondValues[user]);
    }
}
```

{% endtab %}

{% tab title="EncryptMultipleValues.test.ts" %}


```typescript
/**
 * @title EncryptMultipleValues Tests
 * @notice Tests for storing multiple encrypted values
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("EncryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("EncryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "EncryptMultipleValues");
  });

  it("stores and decrypts both values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    encrypted.add64(22);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValues(input.handles[0], input.handles[1], input.inputProof);

    const [encryptedFirst, encryptedSecond] = await contract.getValues(user.address);
    const clearFirst = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedFirst,
      contractAddress,
      user,
    );
    const clearSecond = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSecond,
      contractAddress,
      user,
    );

    expect(clearFirst).to.equal(10n);
    expect(clearSecond).to.equal(22n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Store multiple encrypted values in one transaction.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValues

```solidity
function storeValues(externalEuint64 encFirst, externalEuint64 encSecond, bytes inputProof) external
```

Store two encrypted values for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encFirst | externalEuint64 | First encrypted value handle |
| encSecond | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

### getValues

```solidity
function getValues(address user) external view returns (euint64, euint64)
```

Retrieve both encrypted values for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted values |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | First encrypted value |
| [1] | euint64 | Second encrypted value |
