# UserDecryptSingleValue

> **Category**: Basic | **Difficulty**: Beginner | **Chapters**: Decryption User | **Concept**: User decryption flow for a single encrypted result

Compute on encrypted input and allow the user to decrypt the result.

## Why this example

This example focuses on **User decryption flow for a single encrypted result**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/UserDecryptSingleValue.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="UserDecryptSingleValue.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptSingleValue
 * @author Gustavo Valverde
 * @notice Compute on encrypted input and allow the user to decrypt the result.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-user
 * @custom:concept User decryption flow for a single encrypted result
 * @custom:difficulty beginner
 */
contract UserDecryptSingleValue is ZamaEthereumConfig {
    euint64 private lastResult;

    /// @notice Get the encrypted result.
    /// @return The encrypted result
    function getLastResult() external view returns (euint64) {
        return lastResult;
    }

    /// @notice Add 1 to the encrypted input and store the encrypted result.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function computePlusOne(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        lastResult = FHE.add(value, FHE.asEuint64(1));
        FHE.allowThis(lastResult);
        FHE.allow(lastResult, msg.sender);
    }
}
```

{% endtab %}

{% tab title="UserDecryptSingleValue.test.ts" %}


```typescript
/**
 * @title UserDecryptSingleValue Tests
 * @notice Tests for user decryption of a single encrypted result
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("UserDecryptSingleValue", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("UserDecryptSingleValue");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "UserDecryptSingleValue");
  });

  it("returns an encrypted result the user can decrypt", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(41);
    const input = await encrypted.encrypt();

    await contract.connect(user).computePlusOne(input.handles[0], input.inputProof);

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

## API Reference

## Overview

Compute on encrypted input and allow the user to decrypt the result.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (euint64)
```

Get the encrypted result.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted result |

### computePlusOne

```solidity
function computePlusOne(externalEuint64 encValue, bytes inputProof) external
```

Add 1 to the encrypted input and store the encrypted result.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |
