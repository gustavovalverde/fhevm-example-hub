# SwapERC7984ToERC7984

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Erc7984, Swaps | **Concept**: ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)

Swap one confidential ERC7984 token for another using transient permissions

## Why this example

This example focuses on **ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/SwapERC7984ToERC7984.test.ts
```

## Dependencies

- SimpleKycRegistry
- MintableConfidentialToken

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | SimpleKycRegistry | $deployer | kyc |
| 2 | MintableConfidentialToken | $deployer, "Token A", "TKA", "ipfs://token-a" | tokenA |
| 3 | MintableConfidentialToken | $deployer, "Token B", "TKB", "ipfs://token-b" | tokenB |
| 4 | SwapERC7984ToERC7984 | @kyc | swap |


## Contract and test

{% tabs %}

{% tab title="SwapERC7984ToERC7984.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {SimpleKycRegistry} from "./helpers/SimpleKycRegistry.sol";

// solhint-disable max-line-length
/**
 * @title SwapERC7984ToERC7984
 * @author Gustavo Valverde
 * @notice Swap one confidential ERC7984 token for another using transient permissions
 * @dev Example for fhEVM Examples - OpenZeppelin Confidential Contracts
 *
 * @custom:category identity
 * @custom:chapter erc7984,swaps
 * @custom:concept ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)
 * @custom:difficulty intermediate
 * @custom:depends-on SimpleKycRegistry,MintableConfidentialToken
 * @custom:deploy-plan [{"contract":"SimpleKycRegistry","saveAs":"kyc","args":["$deployer"]},{"contract":"MintableConfidentialToken","saveAs":"tokenA","args":["$deployer","Token A","TKA","ipfs://token-a"]},{"contract":"MintableConfidentialToken","saveAs":"tokenB","args":["$deployer","Token B","TKB","ipfs://token-b"]},{"contract":"SwapERC7984ToERC7984","saveAs":"swap","args":["@kyc"]}]
 *
 * Production alignment:
 * - Regulated ecosystems may support multiple confidential assets (e.g., region-specific stablecoins).
 * - Swaps can be mediated by a contract while keeping the swapped amount confidential.
 *
 * Key pattern:
 * - Use `FHE.allowTransient(handle, token)` before passing encrypted amounts to another contract.
 */
contract SwapERC7984ToERC7984 is ZamaEthereumConfig {
// solhint-enable max-line-length
    /// @notice Error thrown when a non-KYC-approved address attempts an operation
    /// @param account The address that was not KYC-approved
    error NotKycApproved(address account);

    /// @notice Error thrown when caller is not an approved operator for the token
    /// @param caller The address attempting the operation
    /// @param token The token that requires operator approval
    error NotOperator(address caller, address token);

    /// @notice The KYC registry for compliance checks
    SimpleKycRegistry public immutable kyc;

    /**
     * @notice Initializes the swap contract with KYC registry
     * @param kyc_ The KYC registry contract
     */
    constructor(SimpleKycRegistry kyc_) {
        kyc = kyc_;
    }

    /**
     * @notice Swap confidential amount from one ERC7984 token to another
     * @dev Requires operator approval on the `fromToken` for this contract.
     * @param fromToken ERC7984 token to transfer from the user into the swap
     * @param toToken ERC7984 token to transfer from the swap to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapConfidentialForConfidential(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Allow token A to consume the input handle in this tx.
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // Allow token B to consume the transferred handle in this tx.
        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }

    /**
     * @notice Anti-pattern: omit `FHE.allowTransient(amountTransferred, address(toToken))` (will revert)
     * @dev Included to demonstrate a common integration pitfall.
     * @param fromToken ERC7984 token to transfer from the user
     * @param toToken ERC7984 token to transfer to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutAllowingToToken(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // Missing: FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }

    /**
     * @notice Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)
     * @dev Included to demonstrate why token contracts need permission to consume ciphertext inputs.
     * @param fromToken ERC7984 token to transfer from the user
     * @param toToken ERC7984 token to transfer to the user
     * @param encryptedAmount Encrypted amount input
     * @param inputProof Proof for the encrypted input
     */
    function swapWithoutAllowingFromToken(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!kyc.isKycApproved(msg.sender)) revert NotKycApproved(msg.sender);
        if (!fromToken.isOperator(msg.sender, address(this))) revert NotOperator(msg.sender, address(fromToken));

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Missing: FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }
}
```

{% endtab %}

{% tab title="SwapERC7984ToERC7984.test.ts" %}


```typescript
/**
 * @title SwapERC7984ToERC7984 Tests
 * @notice Tests swapping between two confidential ERC7984 tokens
 * @dev Includes failure modes around operator approval and missing allowTransient
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("SwapERC7984ToERC7984", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let tokenA: Awaited<ReturnType<typeof deployTokenA>>;
  let tokenB: Awaited<ReturnType<typeof deployTokenB>>;
  let swap: Awaited<ReturnType<typeof deploySwap>>;

  let tokenAAddress: string;
  let tokenBAddress: string;
  let swapAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployKyc() {
    const factory = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployTokenA() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(owner.address, "Token A", "TKA", "ipfs://token-a");
    await contract.waitForDeployment();
    return contract;
  }

  async function deployTokenB() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(owner.address, "Token B", "TKB", "ipfs://token-b");
    await contract.waitForDeployment();
    return contract;
  }

  async function deploySwap() {
    const factory = await hre.ethers.getContractFactory("SwapERC7984ToERC7984");
    const contract = await factory.deploy(await kyc.getAddress());
    await contract.waitForDeployment();
    return contract;
  }

  async function mint(token: typeof tokenA, to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(await token.getAddress(), owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(token: typeof tokenA, holder: HardhatEthersSigner) {
    const addr = await token.getAddress();
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, addr, holder);
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    await kyc.connect(owner).setKyc(alice.address, true);

    tokenA = await deployTokenA();
    tokenAAddress = await tokenA.getAddress();

    tokenB = await deployTokenB();
    tokenBAddress = await tokenB.getAddress();

    swap = await deploySwap();
    swapAddress = await swap.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(tokenA, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(tokenB, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(swap, "SwapERC7984ToERC7984");

    await mint(tokenA, alice.address, 1_000);
    await mint(tokenB, swapAddress, 1_000);
  });

  it("should revert if user is not KYC-approved", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, bob.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(bob)
        .swapConfidentialForConfidential(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should revert if operator approval is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapConfidentialForConfidential(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should swap confidential balances with allowTransient", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    await tokenA.connect(alice).setOperator(swapAddress, Number(now + 24n * 60n * 60n));

    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(100);
    const input = await encrypted.encrypt();

    await swap
      .connect(alice)
      .swapConfidentialForConfidential(
        tokenAAddress,
        tokenBAddress,
        input.handles[0],
        input.inputProof,
      );

    const aA = await decryptBalance(tokenA, alice);
    const aB = await decryptBalance(tokenB, alice);

    expect(aA).to.equal(900n);
    expect(aB).to.equal(100n);
  });

  it("should revert if omitting allowTransient for the toToken (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapWithoutAllowingToToken(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should revert if omitting allowTransient for the fromToken (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapWithoutAllowingFromToken(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should revert if operator approval is missing
- should revert if omitting allowTransient for the toToken
- should revert if omitting allowTransient for the fromToken
