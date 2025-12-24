# AntiPatternViewOnEncrypted

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Anti Patterns | **Concept**: View functions return encrypted handles, not plaintext

Demonstrates why a view call still returns encrypted handles.

## Why this example

This example focuses on **View functions return encrypted handles, not plaintext**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/AntiPatternViewOnEncrypted.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="AntiPatternViewOnEncrypted.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AntiPatternViewOnEncrypted
 * @author Gustavo Valverde
 * @notice Demonstrates why a view call still returns encrypted handles.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter anti-patterns
 * @custom:concept View functions return encrypted handles, not plaintext
 * @custom:difficulty intermediate
 */
contract AntiPatternViewOnEncrypted is ZamaEthereumConfig {
    mapping(address user => euint64 value) private storedValues;

    /// @notice Store an encrypted value.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        euint64 value = FHE.fromExternal(encValue, inputProof);
        storedValues[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /// @notice Read the encrypted value from a view function.
    /// @dev The return value is still encrypted and must be decrypted off-chain.
    /// @param user Account holding the encrypted value
    /// @return The encrypted value handle
    function getEncryptedValue(address user) external view returns (euint64) {
        return storedValues[user];
    }
}
```

{% endtab %}

{% tab title="AntiPatternViewOnEncrypted.test.ts" %}


```typescript
/**
 * @title AntiPatternViewOnEncrypted Tests
 * @notice Tests for the view-on-encrypted-values pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternViewOnEncrypted", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternViewOnEncrypted");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternViewOnEncrypted");
  });

  it("returns an encrypted handle even in a view call (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(15);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const encryptedResult = await contract.getEncryptedValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      user,
    );

    expect(clear).to.equal(15n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- returns an encrypted handle even in a view call
