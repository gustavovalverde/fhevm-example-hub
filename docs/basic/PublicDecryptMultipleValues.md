# PublicDecryptMultipleValues

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Decryption Public, Relayer | **Concept**: Public decryption flow for multiple encrypted values

Publish multiple encrypted results for public decryption.

## Why this example

This example focuses on **Public decryption flow for multiple encrypted values**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/PublicDecryptMultipleValues.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="PublicDecryptMultipleValues.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptMultipleValues
 * @author Gustavo Valverde
 * @notice Publish multiple encrypted results for public decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-public, relayer
 * @custom:concept Public decryption flow for multiple encrypted values
 * @custom:difficulty intermediate
 */
contract PublicDecryptMultipleValues is ZamaEthereumConfig {
    euint64 private lastFirst;
    euint64 private lastSecond;

    /// @notice Store two encrypted values.
    /// @param encFirst First encrypted value handle
    /// @param encSecond Second encrypted value handle
    /// @param inputProof Proof for the encrypted inputs
    function storeValues(
        externalEuint64 encFirst,
        externalEuint64 encSecond,
        bytes calldata inputProof
    ) external {
        lastFirst = FHE.fromExternal(encFirst, inputProof);
        lastSecond = FHE.fromExternal(encSecond, inputProof);

        FHE.allowThis(lastFirst);
        FHE.allowThis(lastSecond);
        FHE.allow(lastFirst, msg.sender);
        FHE.allow(lastSecond, msg.sender);
    }

    /// @notice Publish both values for public decryption.
    function publishValues() external {
        FHE.makePubliclyDecryptable(lastFirst);
        FHE.makePubliclyDecryptable(lastSecond);
    }

    /// @notice Returns the handles for public decryption.
    /// @return Handle for the first encrypted value
    /// @return Handle for the second encrypted value
    function getValueHandles() external view returns (bytes32, bytes32) {
        return (FHE.toBytes32(lastFirst), FHE.toBytes32(lastSecond));
    }
}
```

{% endtab %}

{% tab title="PublicDecryptMultipleValues.test.ts" %}


```typescript
/**
 * @title PublicDecryptMultipleValues Tests
 * @notice Tests for public decryption of multiple values
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("PublicDecryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("PublicDecryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "PublicDecryptMultipleValues");
  });

  it("publishes multiple encrypted values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(5);
    encrypted.add64(9);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValues(input.handles[0], input.handles[1], input.inputProof);
    await contract.publishValues();

    const [handleA, handleB] = await contract.getValueHandles();
    const decrypted = await hre.fhevm.publicDecrypt([handleA, handleB]);
    const clearA = decrypted.clearValues[handleA as `0x${string}`] as bigint;
    const clearB = decrypted.clearValues[handleB as `0x${string}`] as bigint;

    expect(clearA).to.equal(5n);
    expect(clearB).to.equal(9n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
