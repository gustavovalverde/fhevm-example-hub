# EncryptSingleValue

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Encryption | **Concept**: Store one encrypted value and grant permissions

Store a single encrypted value for each user.

## Why this example

This example focuses on **Store one encrypted value and grant permissions**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/EncryptSingleValue.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="EncryptSingleValue.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptSingleValue
 * @author Gustavo Valverde
 * @notice Store a single encrypted value for each user.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter encryption
 * @custom:concept Store one encrypted value and grant permissions
 * @custom:difficulty beginner
 */
contract EncryptSingleValue is ZamaEthereumConfig {
    mapping(address user => euint64 value) private values;

    /// @notice Store an encrypted value for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        values[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Retrieve the encrypted value for a user.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getValue(address user) external view returns (euint64) {
        return values[user];
    }
}
```

{% endtab %}

{% tab title="EncryptSingleValue.test.ts" %}


```typescript
/**
 * @title EncryptSingleValue Tests
 * @notice Tests for storing a single encrypted value
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("EncryptSingleValue", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("EncryptSingleValue");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "EncryptSingleValue");
  });

  it("stores and decrypts the value", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(123);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const encryptedValue = await contract.getValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedValue,
      contractAddress,
      user,
    );

    expect(clear).to.equal(123n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Store a single encrypted value for each user.

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

### getValue

```solidity
function getValue(address user) external view returns (euint64)
```

Retrieve the encrypted value for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted stored value |
