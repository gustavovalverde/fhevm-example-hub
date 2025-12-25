# CompliantERC20

> **Category**: Identity | **Difficulty**: Advanced | **Chapters**: Compliance | **Concept**: FHE.select() for branch-free compliant transfers

ERC20-like token with encrypted balances and compliance checks

## Why this example

This example focuses on **FHE.select() for branch-free compliant transfers**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/FullFlow.test.ts
```

## Dependencies

- [IdentityRegistry](IdentityRegistry.md)
- IIdentityRegistry
- [ComplianceRules](ComplianceRules.md)

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | IdentityRegistry | - | registry |
| 2 | ComplianceRules | @registry, 1 | complianceRules |
| 3 | CompliantERC20 | "Compliant Token", "CPL", @complianceRules | token |


## Contract and test

{% tabs %}

{% tab title="CompliantERC20.sol" %}


```solidity
// SPDX-License-Identifier: MIT
// solhint-disable func-name-mixedcase
pragma solidity ^0.8.27;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// solhint-disable max-line-length
/**
 * @title CompliantERC20
 * @author Gustavo Valverde
 * @notice ERC20-like token with encrypted balances and compliance checks
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter compliance
 * @custom:concept FHE.select() for branch-free compliant transfers
 * @custom:difficulty advanced
 * @custom:depends-on IdentityRegistry,IIdentityRegistry,ComplianceRules
 * @custom:deploy-plan [{"contract":"IdentityRegistry","saveAs":"registry"},{"contract":"ComplianceRules","saveAs":"complianceRules","args":["@registry",1]},{"contract":"CompliantERC20","saveAs":"token","args":["Compliant Token","CPL","@complianceRules"],"afterDeploy":["await complianceRules.setAuthorizedCaller(await token.getAddress(), true);","console.log(\"Authorized CompliantERC20 as compliance caller:\", await token.getAddress());"]}]
 *
 * This contract implements a compliant token with encrypted balances.
 * Transfers only succeed if both parties pass compliance checks, but
 * failures are handled silently (transfer of 0) to prevent information leakage.
 *
 * Key patterns demonstrated:
 * 1. FHE.select() for branch-free conditional logic
 * 2. Combining multiple encrypted conditions with FHE.and()
 * 3. Encrypted balance management
 * 4. No-revert compliance (privacy-preserving failure handling)
 * 5. Integration with external compliance checker
 */
contract CompliantERC20 is ZamaEthereumConfig {
// solhint-enable max-line-length
    // ============ Token Metadata ============

    /// @notice Token name
    string public name;

    /// @notice Token symbol
    string public symbol;

    /// @notice Token decimals
    uint8 public constant DECIMALS = 18;

    /// @notice Total supply (public for transparency)
    uint256 public totalSupply;

    // ============ Token State ============

    /// @notice Encrypted balances
    mapping(address account => euint64 balance) private balances;

    /// @notice Encrypted allowances
    mapping(address owner => mapping(address spender => euint64 allowance)) private allowances;

    // ============ Compliance State ============

    /// @notice Compliance checker interface (can be ComplianceRules or custom)
    IComplianceChecker public complianceChecker;

    /// @notice Owner/admin
    address public owner;
    /// @notice Pending owner for two-step ownership transfer
    address public pendingOwner;

    // ============ Events ============

    /// @notice Emitted on token transfers (indexed for efficient filtering)
    /// @param from Address tokens are transferred from
    /// @param to Address tokens are transferred to
    event Transfer(address indexed from, address indexed to);

    /// @notice Emitted when spending allowance is set
    /// @param owner Address of the token owner
    /// @param spender Address authorized to spend
    event Approval(address indexed owner, address indexed spender);

    /// @notice Emitted when new tokens are minted
    /// @param to Address receiving the minted tokens
    /// @param amount Number of tokens minted
    event Mint(address indexed to, uint256 indexed amount);

    /// @notice Emitted when the compliance checker contract is updated
    /// @param newChecker Address of the new compliance checker
    event ComplianceCheckerUpdated(address indexed newChecker);

    /// @notice Emitted when ownership transfer is initiated
    /// @param currentOwner Current owner address
    /// @param pendingOwner Address that can accept ownership
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);

    /// @notice Emitted when ownership transfer is completed
    /// @param previousOwner Previous owner address
    /// @param newOwner New owner address
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Errors ============

    /// @notice Thrown when caller is not the contract owner
    error OnlyOwner();
    /// @notice Thrown when caller is not the pending owner
    error OnlyPendingOwner();
    /// @notice Thrown when new owner is the zero address
    error InvalidOwner();

    /// @notice Thrown when compliance checker is required but not set
    error ComplianceCheckerNotSet();
    /// @notice Thrown when caller supplies an unauthorized ciphertext handle
    error UnauthorizedCiphertext();
    /// @notice Thrown when mint amount would exceed uint64 accounting bounds
    error TotalSupplyOverflow();

    // ============ Constructor ============

    /**
     * @notice Initialize the token
     * @param tokenName Token name
     * @param tokenSymbol Token symbol
     * @param checker Address of the compliance checker contract
     */
    constructor(string memory tokenName, string memory tokenSymbol, address checker) {
        name = tokenName;
        symbol = tokenSymbol;
        owner = msg.sender;
        if (checker != address(0)) {
            complianceChecker = IComplianceChecker(checker);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the compliance checker contract
     * @param checker Address of the compliance checker
     */
    function setComplianceChecker(address checker) external {
        if (msg.sender != owner) revert OnlyOwner();
        complianceChecker = IComplianceChecker(checker);
        emit ComplianceCheckerUpdated(checker);
    }

    /**
     * @notice Initiate transfer of contract ownership
     * @param newOwner Address that can accept ownership
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newOwner == address(0)) revert InvalidOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /**
     * @notice Accept ownership transfer
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert OnlyPendingOwner();
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /**
     * @notice Mint tokens to an address
     * @dev Only owner can mint. Compliance is NOT checked on mint.
     * @param to Recipient address
     * @param amount Amount to mint (plaintext)
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (amount > type(uint64).max) revert TotalSupplyOverflow();
        if (totalSupply + amount > type(uint64).max) revert TotalSupplyOverflow();

        euint64 mintAmount = FHE.asEuint64(uint64(amount));
        balances[to] = FHE.add(balances[to], mintAmount);
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        totalSupply += amount;

        emit Mint(to, amount);
    }

    // ============ Token Functions ============

    /**
     * @notice Transfer tokens with encrypted amount
     * @dev Branch-free transfer with compliance checks
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Proof for encrypted input
     * @return success Always returns true (actual transfer amount may be 0)
     *
     * Key insight: We never revert on failed compliance. Instead:
     * - If compliant: transfer the requested amount
     * - If not compliant: transfer 0 (no state change, no info leak)
     */
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool success) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        return _transfer(msg.sender, to, amount);
    }

    /**
     * @notice Transfer with euint64 amount (for approved callers)
     * @param to Recipient
     * @param amount Encrypted amount
     * @return success Always true
     */
    function transfer(address to, euint64 amount) external returns (bool success) {
        if (!FHE.isSenderAllowed(amount)) revert UnauthorizedCiphertext();
        return _transfer(msg.sender, to, amount);
    }

    /**
     * @notice Approve spender to transfer tokens
     * @param spender Address to approve
     * @param encryptedAmount Encrypted allowance amount
     * @param inputProof Proof for encrypted input
     * @return success Always true
     */
    function approve(
        address spender,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool success) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        allowances[msg.sender][spender] = amount;
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, spender);

        emit Approval(msg.sender, spender);
        return true;
    }

    /**
     * @notice Transfer from another account (requires approval)
     * @param from Source address
     * @param to Destination address
     * @param encryptedAmount Encrypted amount
     * @param inputProof Proof for encrypted input
     * @return success Always true
     */
    function transferFrom(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool success) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Check allowance
        ebool hasAllowance = FHE.le(amount, allowances[from][msg.sender]);

        // Reduce allowance (branch-free)
        euint64 newAllowance = FHE.select(
            hasAllowance,
            FHE.sub(allowances[from][msg.sender], amount),
            allowances[from][msg.sender]
        );
        allowances[from][msg.sender] = newAllowance;
        FHE.allowThis(newAllowance);
        FHE.allow(newAllowance, from);
        FHE.allow(newAllowance, msg.sender);

        // Only transfer if allowance was sufficient
        euint64 actualAmount = FHE.select(hasAllowance, amount, FHE.asEuint64(0));

        return _transfer(from, to, actualAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get encrypted balance
     * @param account Address to query
     * @return Encrypted balance
     */
    function balanceOf(address account) external view returns (euint64) {
        return balances[account];
    }

    /**
     * @notice Get encrypted allowance
     * @param account Owner address
     * @param spender Spender address
     * @return Encrypted allowance
     */
    function allowance(address account, address spender) external view returns (euint64) {
        return allowances[account][spender];
    }

    /**
     * @notice Get decimals
     * @return Token decimals
     */
    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal transfer implementation
     * @dev The heart of branch-free compliance
     *
     * Logic flow:
     * 1. Check sender compliance (if checker is set)
     * 2. Check recipient compliance (if checker is set)
     * 3. Check sender has sufficient balance
     * 4. Combine all checks with FHE.and()
     * 5. Use FHE.select() to set transfer amount:
     *    - If all checks pass: transfer requested amount
     *    - If any check fails: transfer 0
     * 6. Update balances (even if amount is 0)
     *
     * @param from Source address
     * @param to Destination address
     * @param amount Encrypted amount to transfer
     * @return success Always returns true (actual transfer may be 0)
     */
    function _transfer(
        address from,
        address to,
        euint64 amount
    ) internal returns (bool success) {
        ebool canTransfer;

        // Check compliance if checker is set
        if (address(complianceChecker) != address(0)) {
            ebool senderCompliant = complianceChecker.checkCompliance(from);
            ebool recipientCompliant = complianceChecker.checkCompliance(to);
            ebool bothCompliant = FHE.and(senderCompliant, recipientCompliant);

            // Check sufficient balance
            ebool hasSufficientBalance = FHE.le(amount, balances[from]);

            // Combine all conditions
            canTransfer = FHE.and(bothCompliant, hasSufficientBalance);
        } else {
            // No compliance checker, only check balance
            canTransfer = FHE.le(amount, balances[from]);
        }

        // Branch-free: select actual amount or 0
        euint64 actualAmount = FHE.select(canTransfer, amount, FHE.asEuint64(0));

        // Update balances
        euint64 newFromBalance = FHE.sub(balances[from], actualAmount);
        euint64 newToBalance = FHE.add(balances[to], actualAmount);

        balances[from] = newFromBalance;
        balances[to] = newToBalance;

        // Set permissions
        FHE.allowThis(newFromBalance);
        FHE.allowThis(newToBalance);
        FHE.allow(newFromBalance, from);
        FHE.allow(newToBalance, to);

        // Always emit (hides success/failure)
        emit Transfer(from, to);

        return true;
    }
}

/**
 * @title IComplianceChecker
 * @author Gustavo Valverde
 * @notice Interface for compliance checking contracts
 */
interface IComplianceChecker {
    /// @notice Check if a user passes compliance requirements
    /// @param user Address to check compliance for
    /// @return Encrypted boolean indicating compliance status
    function checkCompliance(address user) external returns (ebool);
}
```

{% endtab %}

{% tab title="FullFlow.test.ts" %}


```typescript
/**
 * @title Full Integration Tests
 * @notice Tests the complete flow: IdentityRegistry -> ComplianceRules -> CompliantERC20
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("Full Integration Flow", () => {
  let identityRegistry: Awaited<ReturnType<typeof deployIdentityRegistry>>;
  let complianceRules: Awaited<ReturnType<typeof deployComplianceRules>>;
  let token: Awaited<ReturnType<typeof deployToken>>;

  let registryAddress: string;
  let complianceAddress: string;
  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let registrar: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  async function deployIdentityRegistry() {
    const factory = await hre.ethers.getContractFactory("IdentityRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  async function deployComplianceRules(registryAddr: string) {
    const factory = await hre.ethers.getContractFactory("ComplianceRules");
    const contract = await factory.deploy(registryAddr, 1); // minKycLevel = 1
    await contract.waitForDeployment();
    return contract;
  }

  async function deployToken(complianceAddr: string) {
    const factory = await hre.ethers.getContractFactory("CompliantERC20");
    const contract = await factory.deploy("Compliant Token", "CPL", complianceAddr);
    await contract.waitForDeployment();
    return contract;
  }

  async function attestUser(
    userAddress: string,
    birthYearOffset: number,
    countryCode: number,
    kycLevel: number,
    isBlacklisted: boolean,
    signer: HardhatEthersSigner,
  ) {
    const encrypted = hre.fhevm.createEncryptedInput(registryAddress, signer.address);
    encrypted.add8(birthYearOffset);
    encrypted.add16(countryCode);
    encrypted.add8(kycLevel);
    encrypted.addBool(isBlacklisted);
    const encryptedInput = await encrypted.encrypt();

    await identityRegistry
      .connect(signer)
      .attestIdentity(
        userAddress,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.inputProof,
      );
  }

  before(async function () {
    const signers = await hre.ethers.getSigners();
    if (signers.length < 5) {
      return this.skip();
    }
    [owner, registrar, alice, bob, charlie] = signers;

    // Deploy all contracts
    identityRegistry = await deployIdentityRegistry();
    registryAddress = await identityRegistry.getAddress();

    complianceRules = await deployComplianceRules(registryAddress);
    complianceAddress = await complianceRules.getAddress();

    token = await deployToken(complianceAddress);
    tokenAddress = await token.getAddress();

    await complianceRules.connect(owner).setAuthorizedCaller(tokenAddress, true);

    // Initialize coprocessors
    await hre.fhevm.assertCoprocessorInitialized(identityRegistry, "IdentityRegistry");
    await hre.fhevm.assertCoprocessorInitialized(complianceRules, "ComplianceRules");
    await hre.fhevm.assertCoprocessorInitialized(token, "CompliantERC20");

    // Setup registrar
    await identityRegistry.connect(owner).addRegistrar(registrar.address);
  });

  describe("Setup", () => {
    it("should have all contracts deployed correctly", async () => {
      expect(registryAddress).to.not.equal(hre.ethers.ZeroAddress);
      expect(complianceAddress).to.not.equal(hre.ethers.ZeroAddress);
      expect(tokenAddress).to.not.equal(hre.ethers.ZeroAddress);
    });

    it("should have compliance rules pointing to identity registry", async () => {
      expect(await complianceRules.identityRegistry()).to.equal(registryAddress);
    });

    it("should have token pointing to compliance rules", async () => {
      expect(await token.complianceChecker()).to.equal(complianceAddress);
    });
  });

  describe("User Attestation", () => {
    it("should attest Alice (compliant user)", async () => {
      // Alice: KYC level 3, not blacklisted
      await attestUser(alice.address, 90, 840, 3, false, registrar);
      expect(await identityRegistry.isAttested(alice.address)).to.be.true;
    });

    it("should attest Bob (compliant user)", async () => {
      // Bob: KYC level 2, not blacklisted
      await attestUser(bob.address, 95, 276, 2, false, registrar);
      expect(await identityRegistry.isAttested(bob.address)).to.be.true;
    });

    it("should attest Charlie (blacklisted user)", async () => {
      // Charlie: KYC level 1, but blacklisted
      await attestUser(charlie.address, 85, 840, 1, true, registrar);
      expect(await identityRegistry.isAttested(charlie.address)).to.be.true;
    });
  });

  describe("Access Grants", () => {
    it("should allow users to grant ComplianceRules access", async () => {
      await identityRegistry.connect(alice).grantAccessTo(complianceAddress);
      await identityRegistry.connect(bob).grantAccessTo(complianceAddress);
      await identityRegistry.connect(charlie).grantAccessTo(complianceAddress);
    });
  });

  describe("Compliance Checks", () => {
    it("should pass compliance for Alice", async () => {
      await complianceRules.connect(alice).checkCompliance(alice.address);

      const result = await complianceRules.connect(alice).getComplianceResult(alice.address);
      const isCompliant = await hre.fhevm.userDecryptEbool(result, complianceAddress, alice);

      expect(isCompliant).to.be.true;
    });

    it("should pass compliance for Bob", async () => {
      await complianceRules.connect(bob).checkCompliance(bob.address);

      const result = await complianceRules.connect(bob).getComplianceResult(bob.address);
      const isCompliant = await hre.fhevm.userDecryptEbool(result, complianceAddress, bob);

      expect(isCompliant).to.be.true;
    });

    it("should fail compliance for Charlie (blacklisted)", async () => {
      await complianceRules.connect(charlie).checkCompliance(charlie.address);

      const result = await complianceRules.connect(charlie).getComplianceResult(charlie.address);
      const isCompliant = await hre.fhevm.userDecryptEbool(result, complianceAddress, charlie);

      expect(isCompliant).to.be.false;
    });

    it("should fail compliance for non-attested user", async () => {
      const unattested = (await hre.ethers.getSigners())[6];
      await complianceRules.connect(unattested).checkCompliance(unattested.address);

      const result = await complianceRules
        .connect(unattested)
        .getComplianceResult(unattested.address);
      const isCompliant = await hre.fhevm.userDecryptEbool(result, complianceAddress, unattested);

      expect(isCompliant).to.be.false;
    });

    it("should block non-owner callers from checking compliance for others", async () => {
      await expect(
        complianceRules.connect(bob).checkCompliance(alice.address),
      ).to.be.revertedWithCustomError(complianceRules, "CallerNotAuthorized");
    });

    it("should block unauthorized access to cached compliance results", async () => {
      await complianceRules.connect(alice).checkCompliance(alice.address);

      await expect(
        complianceRules.connect(owner).getComplianceResult(alice.address),
      ).to.be.revertedWithCustomError(complianceRules, "AccessProhibited");
    });
  });

  describe("Token Operations", () => {
    // Note: euint64 max is ~18.4 quintillion. Using smaller values for tests.
    const MINT_AMOUNT = 1000000000n; // 1 billion (fits easily in uint64)
    const TRANSFER_AMOUNT = 100000000n; // 100 million
    const UINT64_MAX = (1n << 64n) - 1n;

    it("should mint tokens to Alice", async () => {
      await token.connect(owner).mint(alice.address, MINT_AMOUNT);

      const balance = await token.connect(alice).balanceOf(alice.address);
      const decryptedBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        tokenAddress,
        alice,
      );

      expect(decryptedBalance).to.equal(MINT_AMOUNT);
    });

    it("should reject mint amounts above uint64 max", async () => {
      await expect(
        token.connect(owner).mint(alice.address, UINT64_MAX + 1n),
      ).to.be.revertedWithCustomError(token, "TotalSupplyOverflow");
    });

    it("should allow compliant transfer from Alice to Bob", async () => {
      const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, alice.address);
      encrypted.add64(TRANSFER_AMOUNT);
      const encryptedInput = await encrypted.encrypt();

      await token
        .connect(alice)
        ["transfer(address,bytes32,bytes)"](
          bob.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof,
        );

      // Check Bob's balance
      const bobBalance = await token.connect(bob).balanceOf(bob.address);
      const decryptedBobBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobBalance,
        tokenAddress,
        bob,
      );

      expect(decryptedBobBalance).to.equal(TRANSFER_AMOUNT);

      // Check Alice's balance
      const aliceBalance = await token.connect(alice).balanceOf(alice.address);
      const decryptedAliceBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        tokenAddress,
        alice,
      );

      expect(decryptedAliceBalance).to.equal(MINT_AMOUNT - TRANSFER_AMOUNT);
    });

    it("should reject transfer with unauthorized ciphertext handle", async () => {
      const aliceBalanceHandle = await token.balanceOf(alice.address);

      await expect(
        token.connect(bob)["transfer(address,bytes32)"](bob.address, aliceBalanceHandle),
      ).to.be.revertedWithCustomError(token, "UnauthorizedCiphertext");
    });

    it("should silently fail transfer to Charlie (blacklisted) - branch-free", async () => {
      const aliceBalanceBefore = await token.connect(alice).balanceOf(alice.address);
      const aliceBalanceBeforeDecrypted = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalanceBefore,
        tokenAddress,
        alice,
      );

      const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, alice.address);
      encrypted.add64(TRANSFER_AMOUNT);
      const encryptedInput = await encrypted.encrypt();

      // Transfer should NOT revert - branch-free compliance
      await token
        .connect(alice)
        ["transfer(address,bytes32,bytes)"](
          charlie.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof,
        );

      // Alice's balance should be unchanged (transfer of 0 happened)
      const aliceBalanceAfter = await token.connect(alice).balanceOf(alice.address);
      const aliceBalanceAfterDecrypted = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalanceAfter,
        tokenAddress,
        alice,
      );

      expect(aliceBalanceAfterDecrypted).to.equal(aliceBalanceBeforeDecrypted);
    });
  });

  describe("Compliance Changes", () => {
    it("should update min KYC level and affect compliance", async () => {
      // Increase min KYC level to 3 (Bob has level 2)
      await complianceRules.connect(owner).setMinKycLevel(3);

      // Bob should now fail compliance
      await complianceRules.connect(bob).checkCompliance(bob.address);

      const result = await complianceRules.connect(bob).getComplianceResult(bob.address);
      const isCompliant = await hre.fhevm.userDecryptEbool(result, complianceAddress, bob);

      expect(isCompliant).to.be.false;

      // Reset for other tests
      await complianceRules.connect(owner).setMinKycLevel(1);
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.

## API Reference

## Overview

ERC20-like token with encrypted balances and compliance checks

### Developer Notes

Example for fhEVM Examples - Identity Category

### name

```solidity
string name
```

Token name

### symbol

```solidity
string symbol
```

Token symbol

### DECIMALS

```solidity
uint8 DECIMALS
```

Token decimals

### totalSupply

```solidity
uint256 totalSupply
```

Total supply (public for transparency)

### complianceChecker

```solidity
contract IComplianceChecker complianceChecker
```

Compliance checker interface (can be ComplianceRules or custom)

### owner

```solidity
address owner
```

Owner/admin

### pendingOwner

```solidity
address pendingOwner
```

Pending owner for two-step ownership transfer

### Transfer

```solidity
event Transfer(address from, address to)
```

Emitted on token transfers (indexed for efficient filtering)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address tokens are transferred from |
| to | address | Address tokens are transferred to |

### Approval

```solidity
event Approval(address owner, address spender)
```

Emitted when spending allowance is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address of the token owner |
| spender | address | Address authorized to spend |

### Mint

```solidity
event Mint(address to, uint256 amount)
```

Emitted when new tokens are minted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Address receiving the minted tokens |
| amount | uint256 | Number of tokens minted |

### ComplianceCheckerUpdated

```solidity
event ComplianceCheckerUpdated(address newChecker)
```

Emitted when the compliance checker contract is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newChecker | address | Address of the new compliance checker |

### OwnershipTransferStarted

```solidity
event OwnershipTransferStarted(address currentOwner, address pendingOwner)
```

Emitted when ownership transfer is initiated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentOwner | address | Current owner address |
| pendingOwner | address | Address that can accept ownership |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address previousOwner, address newOwner)
```

Emitted when ownership transfer is completed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| previousOwner | address | Previous owner address |
| newOwner | address | New owner address |

### OnlyOwner

```solidity
error OnlyOwner()
```

Thrown when caller is not the contract owner

### OnlyPendingOwner

```solidity
error OnlyPendingOwner()
```

Thrown when caller is not the pending owner

### InvalidOwner

```solidity
error InvalidOwner()
```

Thrown when new owner is the zero address

### ComplianceCheckerNotSet

```solidity
error ComplianceCheckerNotSet()
```

Thrown when compliance checker is required but not set

### UnauthorizedCiphertext

```solidity
error UnauthorizedCiphertext()
```

Thrown when caller supplies an unauthorized ciphertext handle

### TotalSupplyOverflow

```solidity
error TotalSupplyOverflow()
```

Thrown when mint amount would exceed uint64 accounting bounds

### constructor

```solidity
constructor(string tokenName, string tokenSymbol, address checker) public
```

Initialize the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenName | string | Token name |
| tokenSymbol | string | Token symbol |
| checker | address | Address of the compliance checker contract |

### setComplianceChecker

```solidity
function setComplianceChecker(address checker) external
```

Set the compliance checker contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| checker | address | Address of the compliance checker |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external
```

Initiate transfer of contract ownership

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOwner | address | Address that can accept ownership |

### acceptOwnership

```solidity
function acceptOwnership() external
```

Accept ownership transfer

### mint

```solidity
function mint(address to, uint256 amount) external
```

Mint tokens to an address

_Only owner can mint. Compliance is NOT checked on mint._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| amount | uint256 | Amount to mint (plaintext) |

### transfer

```solidity
function transfer(address to, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Transfer tokens with encrypted amount

_Branch-free transfer with compliance checks_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| encryptedAmount | externalEuint64 | Encrypted amount to transfer |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always returns true (actual transfer amount may be 0) Key insight: We never revert on failed compliance. Instead: - If compliant: transfer the requested amount - If not compliant: transfer 0 (no state change, no info leak) |

### transfer

```solidity
function transfer(address to, euint64 amount) external returns (bool success)
```

Transfer with euint64 amount (for approved callers)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient |
| amount | euint64 | Encrypted amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### approve

```solidity
function approve(address spender, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Approve spender to transfer tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | Address to approve |
| encryptedAmount | externalEuint64 | Encrypted allowance amount |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### transferFrom

```solidity
function transferFrom(address from, address to, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Transfer from another account (requires approval)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Source address |
| to | address | Destination address |
| encryptedAmount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### balanceOf

```solidity
function balanceOf(address account) external view returns (euint64)
```

Get encrypted balance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Address to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | Encrypted balance |

### allowance

```solidity
function allowance(address account, address spender) external view returns (euint64)
```

Get encrypted allowance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Owner address |
| spender | address | Spender address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | Encrypted allowance |

### decimals

```solidity
function decimals() external pure returns (uint8)
```

Get decimals

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | Token decimals |

### _transfer

```solidity
function _transfer(address from, address to, euint64 amount) internal returns (bool success)
```

Internal transfer implementation

_The heart of branch-free compliance

Logic flow:
1. Check sender compliance (if checker is set)
2. Check recipient compliance (if checker is set)
3. Check sender has sufficient balance
4. Combine all checks with FHE.and()
5. Use FHE.select() to set transfer amount:
   - If all checks pass: transfer requested amount
   - If any check fails: transfer 0
6. Update balances (even if amount is 0)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Source address |
| to | address | Destination address |
| amount | euint64 | Encrypted amount to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always returns true (actual transfer may be 0) |

# IComplianceChecker

## Overview

Interface for compliance checking contracts

### checkCompliance

```solidity
function checkCompliance(address user) external returns (ebool)
```

Check if a user passes compliance requirements

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check compliance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating compliance status |
