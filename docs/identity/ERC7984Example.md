# ERC7984Example

> **Category**: Identity | **Difficulty**: Beginner | **Chapters**: Erc7984 | **Concept**: Minimal ERC7984 token with confidential mint + transfer

Minimal ERC7984 confidential token example.

## Why this example

This example focuses on **Minimal ERC7984 token with confidential mint + transfer**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/ERC7984Example.test.ts
```

## Dependencies

None

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | ERC7984Example | $deployer | token |


## Contract and test

{% tabs %}

{% tab title="ERC7984Example.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title ERC7984Example
 * @author Gustavo Valverde
 * @notice Minimal ERC7984 confidential token example.
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept Minimal ERC7984 token with confidential mint + transfer
 * @custom:difficulty beginner
 * @custom:deploy-plan [{"contract":"ERC7984Example","saveAs":"token","args":["$deployer"]}]
 */
contract ERC7984Example is ERC7984, Ownable, ZamaEthereumConfig {
    /**
     * @notice Initialize the minimal ERC7984 token
     * @param initialOwner The address that will own the contract
     */
    constructor(address initialOwner)
        ERC7984("Confidential Token", "CTK", "ipfs://erc7984-example")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mint confidential tokens (owner-only)
     * @param to Recipient
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }
}
```

{% endtab %}

{% tab title="ERC7984Example.test.ts" %}


```typescript
/**
 * @title ERC7984Example Tests
 * @notice Tests minimal ERC7984 confidential token flows
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984Example", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984Example");
    const deployed = await factory.deploy(owner.address);
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    token = await deployToken();
    tokenAddress = await token.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984Example");
  });

  it("mints and transfers confidential balances", async () => {
    const mintInput = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    mintInput.add64(100);
    const mintPayload = await mintInput.encrypt();

    await token.connect(owner).mint(alice.address, mintPayload.handles[0], mintPayload.inputProof);

    const aliceBalanceEncrypted = await token.confidentialBalanceOf(alice.address);
    const aliceBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalanceEncrypted,
      tokenAddress,
      alice,
    );

    expect(aliceBalance).to.equal(100n);

    const transferInput = hre.fhevm.createEncryptedInput(tokenAddress, alice.address);
    transferInput.add64(40);
    const transferPayload = await transferInput.encrypt();

    await token
      .connect(alice)
      ["confidentialTransfer(address,bytes32,bytes)"](
        bob.address,
        transferPayload.handles[0],
        transferPayload.inputProof,
      );

    const aliceBalanceEncryptedAfter = await token.confidentialBalanceOf(alice.address);
    const bobBalanceEncrypted = await token.confidentialBalanceOf(bob.address);

    const aliceBalanceAfter = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalanceEncryptedAfter,
      tokenAddress,
      alice,
    );
    const bobBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      bobBalanceEncrypted,
      tokenAddress,
      bob,
    );

    expect(aliceBalanceAfter).to.equal(60n);
    expect(bobBalance).to.equal(40n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

Minimal ERC7984 confidential token example.

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### constructor

```solidity
constructor(address initialOwner) public
```

Initialize the minimal ERC7984 token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |

### mint

```solidity
function mint(address to, externalEuint64 amount, bytes inputProof) external
```

Mint confidential tokens (owner-only)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient |
| amount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for the encrypted input |
