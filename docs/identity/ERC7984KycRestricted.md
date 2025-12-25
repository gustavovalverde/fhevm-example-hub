# ERC7984KycRestricted

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Erc7984 | **Concept**: OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)

> 📚 [View API Reference](../reference/identity/ERC7984KycRestricted.md)

ERC7984 token with public KYC allowlist enforcement (reverts on non-KYC users)

## Why this example

This example focuses on **OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/ERC7984KycRestricted.test.ts
```

## Dependencies

None

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | ERC7984KycRestricted | $deployer, "KYC Token", "KYCT", "ipfs://kyc-token" | token |


## Contract and test

{% tabs %}

{% tab title="ERC7984KycRestricted.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Restricted} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Restricted.sol";

// solhint-disable max-line-length
/**
 * @title ERC7984KycRestricted
 * @author Gustavo Valverde
 * @notice ERC7984 token with public KYC allowlist enforcement (reverts on non-KYC users)
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984
 * @custom:concept OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)
 * @custom:difficulty intermediate
 * @custom:deploy-plan [{"contract":"ERC7984KycRestricted","saveAs":"token","args":["$deployer","KYC Token","KYCT","ipfs://kyc-token"],"afterDeploy":["await token.approveKyc(deployer.address);","console.log(\"Approved KYC for deployer:\", deployer.address);"]}]
 *
 * Production alignment:
 * - Model KYC as a public boolean/allowlist (attestation is public)
 * - Enforce compliance at the token layer (regulated stablecoin / RWA-lite)
 *
 * This example uses OpenZeppelin Confidential Contracts' `ERC7984Restricted` extension and
 * overrides the restriction policy to behave as an allowlist:
 * - `ALLOWED` can hold/transfer
 * - `DEFAULT` and `BLOCKED` cannot
 */
contract ERC7984KycRestricted is ERC7984Restricted, Ownable, ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error KycNotApproved(address account);

    /**
     * @notice Initializes the KYC-restricted ERC7984 token
     * @param initialOwner The address that will own the contract
     * @param name_ The token name
     * @param symbol_ The token symbol
     * @param contractURI_ The contract metadata URI
     */
    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(initialOwner) {}

    // ============ KYC / Allowlist Admin ============

    /**
     * @notice Mark an address as KYC-approved (allowlisted)
     * @param account The address to approve for KYC
     */
    function approveKyc(address account) external onlyOwner {
        _allowUser(account);
    }

    /**
     * @notice Mark an address as not KYC-approved (block)
     * @param account The address to revoke KYC approval from
     */
    function revokeKyc(address account) external onlyOwner {
        _blockUser(account);
    }

    /**
     * @notice Reset an address to default (not allowlisted)
     * @param account The address to reset to default status
     */
    function resetKyc(address account) external onlyOwner {
        _resetUser(account);
    }

    /**
     * @notice Allowlist policy: only ALLOWED accounts are permitted
     * @param account The address to check
     * @return Whether the account is KYC-approved (ALLOWED status)
     */
    function isUserAllowed(address account) public view override returns (bool) {
        return getRestriction(account) == Restriction.ALLOWED;
    }

    // ============ Token Admin ============

    /**
     * @notice Mint confidential tokens (owner-only)
     * @param to Recipient (must be KYC-approved)
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }

    /**
     * @notice Burn confidential tokens (owner-only)
     * @param from Address to burn from (must be KYC-approved)
     * @param amount Encrypted amount
     * @param inputProof Proof for the encrypted input
     */
    function burn(address from, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _burn(from, FHE.fromExternal(amount, inputProof));
    }
}
```

{% endtab %}

{% tab title="ERC7984KycRestricted.test.ts" %}


```typescript
/**
 * @title ERC7984KycRestricted Tests
 * @notice Tests public KYC allowlist enforcement on an ERC7984 token
 * @dev Uses OpenZeppelin Confidential Contracts + fhEVM mocked mode
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984KycRestricted", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984KycRestricted");
    const contract = await factory.deploy(owner.address, "KYC Token", "KYCT", "ipfs://kyc-token");
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
    await token
      .connect(from)
      ["confidentialTransfer(address,bytes32,bytes)"](to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(holder: HardhatEthersSigner) {
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, holder);
  }

  before(async () => {
    [owner, alice, bob, carol] = await hre.ethers.getSigners();
    token = await deployToken();
    tokenAddress = await token.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984KycRestricted");
  });

  it("should reject minting to non-KYC accounts (pitfall)", async () => {
    await expect(mintTo(alice.address, 1_000_000)).to.be.reverted;
  });

  it("should allow owner to approve KYC and mint", async () => {
    await token.connect(owner).approveKyc(alice.address);
    await token.connect(owner).approveKyc(bob.address);

    await expect(mintTo(alice.address, 1_000_000)).to.not.be.reverted;

    const aliceBal = await decryptBalance(alice);
    expect(aliceBal).to.equal(1_000_000n);
  });

  it("should allow transfers between KYC-approved users", async () => {
    await transfer(alice, bob.address, 250_000);

    const aliceBal = await decryptBalance(alice);
    const bobBal = await decryptBalance(bob);

    expect(aliceBal).to.equal(750_000n);
    expect(bobBal).to.equal(250_000n);
  });

  it("should revert transfers to non-KYC recipients (pitfall)", async () => {
    await expect(transfer(alice, carol.address, 1)).to.be.reverted;
  });

  it("should revert transfers from users whose KYC was revoked", async () => {
    await token.connect(owner).revokeKyc(alice.address);

    await expect(transfer(alice, bob.address, 1)).to.be.reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should reject minting to non-KYC accounts
- should revert transfers to non-KYC recipients
