# InputProofsExplained

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Input Proofs | **Concept**: Input proofs bind encrypted inputs to a contract and sender

Demonstrate input proof binding to contract and signer.

## Why this example

This example focuses on **Input proofs bind encrypted inputs to a contract and sender**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/InputProofsExplained.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="InputProofsExplained.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title InputProofsExplained
 * @author Gustavo Valverde
 * @notice Demonstrate input proof binding to contract and signer.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter input-proofs
 * @custom:concept Input proofs bind encrypted inputs to a contract and sender
 * @custom:difficulty intermediate
 */
contract InputProofsExplained is ZamaEthereumConfig {
    mapping(address user => euint64 secret) private secrets;

    /// @notice Store an encrypted secret for the sender.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeSecret(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        secrets[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Retrieve the encrypted secret for a user.
    /// @param user Account holding the encrypted secret
    /// @return The encrypted secret value
    function getSecret(address user) external view returns (euint64) {
        return secrets[user];
    }
}
```

{% endtab %}

{% tab title="InputProofsExplained.test.ts" %}


```typescript
/**
 * @title InputProofsExplained Tests
 * @notice Tests for input proof binding to contract and signer
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("InputProofsExplained", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let otherContract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("InputProofsExplained");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [, alice, bob] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    contract = await deployContract();
    otherContract = await deployContract();
    contractAddress = await contract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(contract, "InputProofsExplained");
    await hre.fhevm.assertCoprocessorInitialized(otherContract, "InputProofsExplained");
  });

  it("stores a secret for the correct sender", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(777);
    const input = await encrypted.encrypt();

    await contract.connect(alice).storeSecret(input.handles[0], input.inputProof);

    const encryptedSecret = await contract.getSecret(alice.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSecret,
      contractAddress,
      alice,
    );

    expect(clear).to.equal(777n);
  });

  it("rejects a proof bound to a different sender (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(contract.connect(bob).storeSecret(input.handles[0], input.inputProof)).to.be
      .reverted;
  });

  it("rejects a proof bound to a different contract (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    await expect(otherContract.connect(alice).storeSecret(input.handles[0], input.inputProof)).to.be
      .reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- rejects a proof bound to a different sender
- rejects a proof bound to a different contract

## API Reference

## Overview

Demonstrate input proof binding to contract and signer.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeSecret

```solidity
function storeSecret(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted secret for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getSecret

```solidity
function getSecret(address user) external view returns (euint64)
```

Retrieve the encrypted secret for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted secret |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted secret value |
