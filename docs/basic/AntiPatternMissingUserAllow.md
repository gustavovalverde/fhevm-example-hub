# AntiPatternMissingUserAllow

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Anti Patterns | **Concept**: Missing FHE.allow(user) blocks user decryption

> 📚 [View API Reference](../reference/basic/AntiPatternMissingUserAllow.md)

Forgetting to grant user access prevents decryption.

## Why this example

This example focuses on **Missing FHE.allow(user) blocks user decryption**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/AntiPatternMissingUserAllow.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="AntiPatternMissingUserAllow.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternMissingUserAllow
 * @author Gustavo Valverde
 * @notice Forgetting to grant user access prevents decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept Missing FHE.allow(user) blocks user decryption
 * @custom:difficulty intermediate
 */
contract AntiPatternMissingUserAllow is ZamaEthereumConfig {
    mapping(address user => euint64 value) private stored;

    /// @notice Store an encrypted value but forget to grant user access (pitfall).
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        stored[msg.sender] = value;
        FHE.allowThis(value);
    }

    /// @notice Return the stored encrypted value.
    /// @param user Account holding the encrypted value
    /// @return The encrypted stored value
    function getStoredValue(address user) external view returns (euint64) {
        return stored[user];
    }
}
```

{% endtab %}

{% tab title="AntiPatternMissingUserAllow.test.ts" %}


```typescript
/**
 * @title AntiPatternMissingUserAllow Tests
 * @notice Tests the missing user allow pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternMissingUserAllow", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternMissingUserAllow");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternMissingUserAllow");
  });

  it("fails to decrypt when FHE.allow(user) is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(123);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const stored = await contract.getStoredValue(user.address);

    let failed = false;
    try {
      await hre.fhevm.userDecryptEuint(FhevmType.euint64, stored, contractAddress, user);
    } catch (_error) {
      failed = true;
    }

    expect(failed).to.equal(true);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- fails to decrypt when FHE.allow(user) is missing
