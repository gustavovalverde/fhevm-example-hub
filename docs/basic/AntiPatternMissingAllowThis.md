# AntiPatternMissingAllowThis

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Anti Patterns | **Concept**: Missing FHE.allowThis breaks reuse of stored handles

Demonstrates the pitfall of omitting FHE.allowThis on stored values.

## Why this example

This example focuses on **Missing FHE.allowThis breaks reuse of stored handles**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/AntiPatternMissingAllowThis.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="AntiPatternMissingAllowThis.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternMissingAllowThis
 * @author Gustavo Valverde
 * @notice Demonstrates the pitfall of omitting FHE.allowThis on stored values.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept Missing FHE.allowThis breaks reuse of stored handles
 * @custom:difficulty intermediate
 */
contract AntiPatternMissingAllowThis is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value without granting the contract permission.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        // Intentionally missing FHE.allowThis(value)
        FHE.allow(value, msg.sender);
    }

    /// @notice Try to reuse the stored value (expected to fail in practice).
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function addToStored(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        euint64 updated = FHE.add(storedValues[msg.sender], value);
        storedValues[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
    }

    /// @notice Retrieve the stored value.
    /// @param user Account holding the encrypted value
    /// @return The stored encrypted value
    function getStoredValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
```

{% endtab %}

{% tab title="AntiPatternMissingAllowThis.test.ts" %}


```typescript
/**
 * @title AntiPatternMissingAllowThis Tests
 * @notice Tests for the missing FHE.allowThis pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternMissingAllowThis", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternMissingAllowThis");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternMissingAllowThis");
  });

  it("should fail when reusing a handle without allowThis (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(3);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const increment = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    increment.add64(1);
    const incInput = await increment.encrypt();

    await expect(contract.connect(user).addToStored(incInput.handles[0], incInput.inputProof)).to.be
      .reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should fail when reusing a handle without allowThis
