# HandleLifecycle

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Handles | **Concept**: Store encrypted handles and reuse them across calls

Show how encrypted handles can be stored and reused safely.

## Why this example

This example focuses on **Store encrypted handles and reuse them across calls**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/HandleLifecycle.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="HandleLifecycle.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleLifecycle
 * @author Gustavo Valverde
 * @notice Show how encrypted handles can be stored and reused safely.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter handles
 * @custom:concept Store encrypted handles and reuse them across calls
 * @custom:difficulty intermediate
 */
contract HandleLifecycle is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Add an encrypted value to the stored handle.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function addToStored(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        euint64 updated = FHE.add(storedValues[msg.sender], value);
        storedValues[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
    }

    /// @notice Retrieve the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The stored encrypted value
    function getStoredValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
```

{% endtab %}

{% tab title="HandleLifecycle.test.ts" %}


```typescript
/**
 * @title HandleLifecycle Tests
 * @notice Tests for reusing encrypted handles across calls
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("HandleLifecycle", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("HandleLifecycle");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "HandleLifecycle");
  });

  it("stores and reuses encrypted handles", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const increment = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    increment.add64(7);
    const addInput = await increment.encrypt();

    await contract.connect(user).addToStored(addInput.handles[0], addInput.inputProof);

    const encryptedValue = await contract.getStoredValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedValue,
      contractAddress,
      user,
    );

    expect(clear).to.equal(17n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Show how encrypted handles can be stored and reused safely.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValue

```solidity
function storeValue(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted value for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### addToStored

```solidity
function addToStored(externalEuint64 encValue, bytes inputProof) external
```

Add an encrypted value to the stored handle.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getStoredValue

```solidity
function getStoredValue(address user) external view returns (euint64)
```

Retrieve the stored encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The stored encrypted value |
