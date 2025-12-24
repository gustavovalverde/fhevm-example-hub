# PublicDecryptSingleValue

> **Category**: Basic | **Difficulty**: Intermediate | **Chapters**: Decryption Public, Relayer | **Concept**: Public decryption flow for a single encrypted value

Publish a single encrypted result for public decryption.

## Why this example

This example focuses on **Public decryption flow for a single encrypted value**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/basic/PublicDecryptSingleValue.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="PublicDecryptSingleValue.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptSingleValue
 * @author Gustavo Valverde
 * @notice Publish a single encrypted result for public decryption.
 * @dev Example for fhEVM Examples - Basic Category
 *
 * @custom:category basic
 * @custom:chapter decryption-public, relayer
 * @custom:concept Public decryption flow for a single encrypted value
 * @custom:difficulty intermediate
 */
contract PublicDecryptSingleValue is ZamaEthereumConfig {
    euint64 private lastValue;

    /// @notice Returns the last encrypted value.
    /// @return The last encrypted value
    function getLastValue() external view returns (euint64) {
        return lastValue;
    }

    /// @notice Store an encrypted value.
    /// @param encValue Encrypted value handle
    /// @param inputProof Proof for the encrypted input
    function storeValue(externalEuint64 encValue, bytes calldata inputProof) external {
        lastValue = FHE.fromExternal(encValue, inputProof);
        FHE.allowThis(lastValue);
        FHE.allow(lastValue, msg.sender);
    }

    /// @notice Publish the encrypted value for public decryption.
    function publishValue() external {
        FHE.makePubliclyDecryptable(lastValue);
    }

    /// @notice Returns the handle for public decryption.
    /// @return The encrypted handle as bytes32
    function getValueHandle() external view returns (bytes32) {
        return FHE.toBytes32(lastValue);
    }
}
```

{% endtab %}

{% tab title="PublicDecryptSingleValue.test.ts" %}


```typescript
/**
 * @title PublicDecryptSingleValue Tests
 * @notice Tests for public decryption of a single value
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("PublicDecryptSingleValue", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("PublicDecryptSingleValue");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "PublicDecryptSingleValue");
  });

  it("publishes an encrypted value for public decrypt", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(88);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    await contract.publishValue();

    const handle = await contract.getValueHandle();
    const decrypted = await hre.fhevm.publicDecrypt([handle]);
    const clear = decrypted.clearValues[handle as `0x${string}`] as bigint;

    expect(clear).to.equal(88n);
  });

  it("should not allow public decrypt before publishing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    const handle = await contract.getValueHandle();

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([handle]);
    } catch {
      failed = true;
    }

    expect(failed).to.equal(true);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should not allow public decrypt before publishing
