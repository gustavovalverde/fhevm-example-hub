# HandleGeneration

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Handles | **Concept**: Handles are opaque references; FHE ops create derived handles (symbolic execution)

Show how encrypted handles are created and derived without plaintext.

## Why this example

This example focuses on **Handles are opaque references; FHE ops create derived handles (symbolic execution)**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/HandleGeneration.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="HandleGeneration.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleGeneration
 * @author Gustavo Valverde
 * @notice Show how encrypted handles are created and derived without plaintext.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter handles
 * @custom:concept Handles are opaque references; FHE ops create derived handles (symbolic execution)
 * @custom:difficulty intermediate
 */
contract HandleGeneration is ZamaEthereumConfig {
    mapping(address user => euint64 value) private stored;
    mapping(address user => euint64 value) private derived;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        stored[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Create a derived handle by adding and doubling (symbolic execution).
    /// @param addend Plaintext addend applied to the stored encrypted value
    function deriveValue(uint64 addend) external {
        euint64 baseValue = stored[msg.sender];
        euint64 withAdd = FHE.add(baseValue, addend);
        euint64 doubled = FHE.add(withAdd, withAdd);
        derived[msg.sender] = doubled;
        FHE.allowThis(doubled);
        FHE.allow(doubled, msg.sender);
    }

    /// @notice Return the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getStoredValue(address user) external view returns (euint64) {
        return stored[user];
    }

    /// @notice Return the derived encrypted value.
    /// @param user Account holding the derived value
    /// @return The encrypted derived value
    function getDerivedValue(address user) external view returns (euint64) {
        return derived[user];
    }

    /// @notice Return the raw handle bytes for the stored value.
    /// @param user Account holding the encrypted value
    /// @return Raw handle bytes for the stored value
    function getStoredHandle(address user) external view returns (bytes32) {
        return FHE.toBytes32(stored[user]);
    }

    /// @notice Return the raw handle bytes for the derived value.
    /// @param user Account holding the derived value
    /// @return Raw handle bytes for the derived value
    function getDerivedHandle(address user) external view returns (bytes32) {
        return FHE.toBytes32(derived[user]);
    }
}
```

{% endtab %}

{% tab title="HandleGeneration.test.ts" %}


```typescript
/**
 * @title HandleGeneration Tests
 * @notice Tests handle creation and derived handles without plaintext
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("HandleGeneration", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("HandleGeneration");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "HandleGeneration");
  });

  it("derives a new handle via symbolic execution", async () => {
    const zeroHash = `0x${"0".repeat(64)}`;
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    await contract.connect(user).deriveValue(5);

    const storedHandle = await contract.getStoredHandle(user.address);
    const derivedHandle = await contract.getDerivedHandle(user.address);

    expect(storedHandle).to.not.equal(zeroHash);
    expect(derivedHandle).to.not.equal(zeroHash);

    const derivedValue = await contract.getDerivedValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      derivedValue,
      contractAddress,
      user,
    );

    expect(clear).to.equal(30n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Show how encrypted handles are created and derived without plaintext.

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

### deriveValue

```solidity
function deriveValue(uint64 addend) external
```

Create a derived handle by adding and doubling (symbolic execution).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addend | uint64 | Plaintext addend applied to the stored encrypted value |

### getStoredValue

```solidity
function getStoredValue(address user) external view returns (euint64)
```

Return the stored encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted stored value |

### getDerivedValue

```solidity
function getDerivedValue(address user) external view returns (euint64)
```

Return the derived encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the derived value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted derived value |

### getStoredHandle

```solidity
function getStoredHandle(address user) external view returns (bytes32)
```

Return the raw handle bytes for the stored value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Raw handle bytes for the stored value |

### getDerivedHandle

```solidity
function getDerivedHandle(address user) external view returns (bytes32)
```

Return the raw handle bytes for the derived value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the derived value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Raw handle bytes for the derived value |
