# ComplianceRules

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Compliance | **Concept**: Combining encrypted compliance checks with FHE.and()

Combines multiple compliance checks using FHE operations

## Why this example

This example focuses on **Combining encrypted compliance checks with FHE.and()**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/FullFlow.test.ts
```

## Dependencies

- [IdentityRegistry](IdentityRegistry.md)

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | IdentityRegistry | - | registry |
| 2 | ComplianceRules | @registry, 1 | complianceRules |
| 3 | CompliantERC20 | "Compliant Token", "CPL", @complianceRules | token |


## Contract and test

{% tabs %}

{% tab title="ComplianceRules.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IIdentityRegistry} from "./IIdentityRegistry.sol";

// solhint-disable max-line-length
/**
 * @title ComplianceRules
 * @author Gustavo Valverde
 * @notice Combines multiple compliance checks using FHE operations
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter compliance
 * @custom:concept Combining encrypted compliance checks with FHE.and()
 * @custom:difficulty intermediate
 * @custom:depends-on IdentityRegistry
 * @custom:deploy-plan [{"contract":"IdentityRegistry","saveAs":"registry"},{"contract":"ComplianceRules","saveAs":"complianceRules","args":["@registry",1]},{"contract":"CompliantERC20","saveAs":"token","args":["Compliant Token","CPL","@complianceRules"],"afterDeploy":["await complianceRules.setAuthorizedCaller(await token.getAddress(), true);","console.log(\"Authorized CompliantERC20 as compliance caller:\", await token.getAddress());"]}]
 *
 * This contract aggregates compliance checks from IdentityRegistry and returns
 * encrypted boolean results. Consumer contracts (like CompliantERC20) can use
 * these results with FHE.select() for branch-free logic.
 *
 * Key patterns demonstrated:
 * 1. FHE.and() for combining multiple encrypted conditions
 * 2. Integration with IdentityRegistry
 * 3. Configurable compliance parameters
 * 4. Encrypted result caching
 */
contract ComplianceRules is ZamaEthereumConfig {
// solhint-enable max-line-length
    // ============ State ============

    /// @notice Reference to the identity registry
    IIdentityRegistry public immutable identityRegistry;

    /// @notice Owner/admin
    address public owner;
    /// @notice Pending owner for two-step ownership transfer
    address public pendingOwner;

    /// @notice Minimum KYC level required for compliance
    uint8 public minKycLevel;

    /// @notice Store last compliance check result for each user
    mapping(address user => ebool result) private complianceResults;

    /// @notice Authorized callers that can request compliance checks for others
    mapping(address caller => bool authorized) public authorizedCallers;

    // ============ Events ============

    /// @notice Emitted when the minimum KYC level requirement is updated
    /// @param newLevel The new minimum KYC level required for compliance
    event MinKycLevelUpdated(uint8 indexed newLevel);

    /// @notice Emitted when a compliance check is performed for a user
    /// @param user Address of the user whose compliance was checked
    event ComplianceChecked(address indexed user);

    /// @notice Emitted when a caller's authorization is updated
    /// @param caller Address being authorized or revoked
    /// @param allowed Whether the caller is allowed
    event AuthorizedCallerUpdated(address indexed caller, bool indexed allowed);

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

    /// @notice Thrown when registry address is zero
    error RegistryNotSet();

    /// @notice Thrown when caller is not authorized to check another user
    error CallerNotAuthorized();

    /// @notice Thrown when caller lacks permission for encrypted result
    error AccessProhibited();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAuthorizedOrSelf(address user) {
        if (msg.sender != user && !authorizedCallers[msg.sender]) {
            revert CallerNotAuthorized();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize with identity registry reference
     * @param registry Address of the IdentityRegistry contract
     * @param initialMinKycLevel Initial minimum KYC level (default: 1)
     */
    constructor(address registry, uint8 initialMinKycLevel) {
        if (registry == address(0)) revert RegistryNotSet();
        identityRegistry = IIdentityRegistry(registry);
        owner = msg.sender;
        minKycLevel = initialMinKycLevel;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum KYC level
     * @param newLevel New minimum level
     */
    function setMinKycLevel(uint8 newLevel) external onlyOwner {
        minKycLevel = newLevel;
        emit MinKycLevelUpdated(newLevel);
    }

    /**
     * @notice Allow or revoke a caller to check compliance for other users
     * @param caller Address to update
     * @param allowed Whether the caller is allowed
     */
    function setAuthorizedCaller(address caller, bool allowed) external onlyOwner {
        authorizedCallers[caller] = allowed;
        emit AuthorizedCallerUpdated(caller, allowed);
    }

    /**
     * @notice Initiate transfer of contract ownership
     * @param newOwner Address that can accept ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
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

    // ============ Compliance Checks ============

    /**
     * @notice Check if user passes all compliance requirements
     * @dev Combines: hasMinKycLevel AND isNotBlacklisted
     * @param user Address to check
     * @return Encrypted boolean indicating compliance status
     *
     * Note: This function makes external calls to IdentityRegistry which
     * computes and stores verification results. The combined result is
     * stored locally for later retrieval.
     */
    function checkCompliance(address user) external onlyAuthorizedOrSelf(user) returns (ebool) {
        // Check if user is attested
        if (!identityRegistry.isAttested(user)) {
            ebool notAttestedResult = FHE.asEbool(false);
            FHE.allowThis(notAttestedResult);
            FHE.allow(notAttestedResult, msg.sender);
            complianceResults[user] = notAttestedResult;
            return notAttestedResult;
        }

        // Get individual compliance checks
        ebool hasKyc = identityRegistry.hasMinKycLevel(user, minKycLevel);
        ebool notBlacklisted = identityRegistry.isNotBlacklisted(user);

        // Combine all conditions
        ebool result = FHE.and(hasKyc, notBlacklisted);

        // Store and grant permissions
        complianceResults[user] = result;
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        emit ComplianceChecked(user);

        return result;
    }

    /**
     * @notice Check compliance with additional country restriction
     * @param user Address to check
     * @param allowedCountry Country code that is allowed
     * @return Encrypted boolean indicating compliance status
     */
    function checkComplianceWithCountry(
        address user,
        uint16 allowedCountry
    ) external onlyAuthorizedOrSelf(user) returns (ebool) {
        // Check if user is attested
        if (!identityRegistry.isAttested(user)) {
            ebool notAttestedResult = FHE.asEbool(false);
            FHE.allowThis(notAttestedResult);
            FHE.allow(notAttestedResult, msg.sender);
            return notAttestedResult;
        }

        // Get individual compliance checks
        ebool hasKyc = identityRegistry.hasMinKycLevel(user, minKycLevel);
        ebool notBlacklisted = identityRegistry.isNotBlacklisted(user);
        ebool isFromAllowedCountry = identityRegistry.isFromCountry(user, allowedCountry);

        // Combine all conditions
        ebool result = FHE.and(FHE.and(hasKyc, notBlacklisted), isFromAllowedCountry);

        // Grant permissions
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        emit ComplianceChecked(user);

        return result;
    }

    /**
     * @notice Get the last compliance check result for a user
     * @dev Call checkCompliance first to compute and store the result
     * @param user Address to get result for
     * @return Encrypted boolean result
     */
    function getComplianceResult(address user) external view returns (ebool) {
        ebool result = complianceResults[user];
        if (!FHE.isSenderAllowed(result)) revert AccessProhibited();
        return result;
    }

    /**
     * @notice Check if compliance result exists for user
     * @param user Address to check
     * @return Whether a cached result exists
     */
    function hasComplianceResult(address user) external view returns (bool) {
        return FHE.isInitialized(complianceResults[user]);
    }
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
