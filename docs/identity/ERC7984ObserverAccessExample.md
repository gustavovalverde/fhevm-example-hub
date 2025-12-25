# ERC7984ObserverAccessExample

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Erc7984 | **Concept**: ERC7984ObserverAccess for opt-in audit / compliance observers

Travel-Rule style observer access for confidential token balances and transfer amounts

## Why this example

This example focuses on **ERC7984ObserverAccess for opt-in audit / compliance observers**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/ERC7984ObserverAccessExample.test.ts
```

## Dependencies

None

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | ERC7984ObserverAccessExample | $deployer | token |


## Contract and test

{% tabs %}

{% tab title="ERC7984ObserverAccessExample.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
// solhint-disable-next-line max-line-length
import {ERC7984ObserverAccess} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ObserverAccess.sol";

/**
 * @title ERC7984ObserverAccessExample
 * @author Gustavo Valverde
 * @notice Travel-Rule style observer access for confidential token balances and transfer amounts
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept ERC7984ObserverAccess for opt-in audit / compliance observers
 * @custom:difficulty intermediate
 * @custom:deploy-plan [{"contract":"ERC7984ObserverAccessExample","saveAs":"token","args":["$deployer"]}]
 *
 * Production alignment:
 * - Users may need to grant a VASP/compliance officer limited visibility for audits / Travel Rule.
 * - `ERC7984ObserverAccess` lets a user opt-in an "observer" that gets ACL access to:
 *   - the user's confidential balance handle
 *   - transfer amount handles involving the user
 *
 * Important pitfall:
 * - ACL grants are permanent for a given ciphertext handle: removing an observer stops *future* grants,
 *   but does not revoke access to ciphertext handles already shared earlier.
 */
contract ERC7984ObserverAccessExample is ERC7984ObserverAccess, Ownable, ZamaEthereumConfig {
    /**
     * @notice Initializes the Observer Access ERC7984 token
     * @param initialOwner The address that will own the contract
     */
    constructor(address initialOwner)
        ERC7984("Observer Access Token", "OAT", "ipfs://observer-access")
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

{% tab title="ERC7984ObserverAccessExample.test.ts" %}


```typescript
/**
 * @title ERC7984ObserverAccessExample Tests
 * @notice Tests observer (audit) access for confidential balances and transfer amounts
 * @dev Demonstrates the permanent-ACL pitfall: past ciphertext access cannot be revoked
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ZeroAddress } from "ethers";
import hre from "hardhat";

describe("ERC7984ObserverAccessExample", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984ObserverAccessExample");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function mintTo(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function transfer(from: HardhatEthersSigner, to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, from.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    const tx = await token
      .connect(from)
      ["confidentialTransfer(address,bytes32,bytes)"](to, input.handles[0], input.inputProof);
    return await tx.wait();
  }

  function findTransferHandle(
    receipt: Awaited<ReturnType<typeof transfer>>,
    from: string,
    to: string,
  ) {
    if (!receipt) throw new Error("Receipt is null");
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
      try {
        const parsed = token.interface.parseLog(log);
        if (parsed?.name !== "ConfidentialTransfer") continue;
        const [evtFrom, evtTo, transferred] = parsed.args;
        if (evtFrom === from && evtTo === to) return transferred as string;
      } catch {
        // ignore
      }
    }
    throw new Error("ConfidentialTransfer event not found");
  }

  async function decrypt(handle: string, signer: HardhatEthersSigner) {
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, signer);
  }

  before(async () => {
    [owner, alice, bob, auditor] = await hre.ethers.getSigners();
    token = await deployToken();
    tokenAddress = await token.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984ObserverAccessExample");
  });

  it("should allow an observer to decrypt the user's balance after opt-in", async () => {
    await mintTo(alice.address, 1_000_000);

    await token.connect(alice).setObserver(alice.address, auditor.address);

    const aliceBalanceHandle = await token.confidentialBalanceOf(alice.address);
    const clear = await decrypt(aliceBalanceHandle, auditor);
    expect(clear).to.equal(1_000_000n);
  });

  it("should allow an observer to decrypt transfer amount handles involving the user", async () => {
    const receipt = await transfer(alice, bob.address, 250_000);
    const transferredHandle = findTransferHandle(receipt, alice.address, bob.address);

    const clearTransferred = await decrypt(transferredHandle, auditor);
    expect(clearTransferred).to.equal(250_000n);
  });

  it("should not grant future access after observer removal, but old ciphertext stays decryptable (pitfall)", async () => {
    const oldBalanceHandle = await token.confidentialBalanceOf(alice.address);
    const oldClear = await decrypt(oldBalanceHandle, auditor);
    expect(oldClear).to.equal(750_000n);

    await token.connect(alice).setObserver(alice.address, ZeroAddress);

    // Trigger a balance update so Alice gets a new balance handle.
    await transfer(alice, bob.address, 1);

    const newBalanceHandle = await token.confidentialBalanceOf(alice.address);

    let failed = false;
    try {
      await decrypt(newBalanceHandle, auditor);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);

    // Previously obtained ciphertext remains decryptable.
    const stillClear = await decrypt(oldBalanceHandle, auditor);
    expect(stillClear).to.equal(750_000n);
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should not grant future access after observer removal, but old ciphertext stays decryptable

## API Reference

## Overview

Travel-Rule style observer access for confidential token balances and transfer amounts

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### constructor

```solidity
constructor(address initialOwner) public
```

Initializes the Observer Access ERC7984 token

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
