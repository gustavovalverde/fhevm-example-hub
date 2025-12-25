# IdentityRegistry

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Identity, Access Control | **Concept**: Storing encrypted identity attributes (euint8, euint16, ebool)

On-chain encrypted identity registry for KYC or compliance platforms

## Why this example

This example focuses on **Storing encrypted identity attributes (euint8, euint16, ebool)**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/IdentityRegistry.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="IdentityRegistry.sol" %}


```solidity
// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time
pragma solidity ^0.8.27;

import {FHE, euint8, euint16, ebool, externalEuint8, externalEuint16, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IIdentityRegistry} from "./IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @author Gustavo Valverde
 * @notice On-chain encrypted identity registry for KYC or compliance platforms
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter identity,access-control
 * @custom:concept Storing encrypted identity attributes (euint8, euint16, ebool)
 * @custom:difficulty intermediate
 *
 * This contract maintains an encrypted identity registry where authorized registrars
 * (typically a backend service) can attest to user identity attributes. All sensitive data
 * remains encrypted on-chain.
 *
 * Key patterns demonstrated:
 * 1. Multiple encrypted types (euint8, euint16, ebool)
 * 2. Role-based access control (registrars)
 * 3. Struct-like data storage with mappings
 * 4. FHE permission management (allowThis, allow)
 */
contract IdentityRegistry is IIdentityRegistry, ZamaEthereumConfig {
    // ============ Encrypted Identity Attributes ============

    /// @notice Encrypted birth year offset from 1900
    mapping(address user => euint8 birthYearOffset) private birthYearOffsets;

    /// @notice Encrypted country code (ISO 3166-1 numeric)
    mapping(address user => euint16 countryCode) private countryCodes;

    /// @notice Encrypted KYC verification level (0-5)
    mapping(address user => euint8 kycLevel) private kycLevels;

    /// @notice Encrypted blacklist status
    mapping(address user => ebool blacklisted) private isBlacklisted;

    /// @notice Timestamp of last attestation
    mapping(address user => uint256 timestamp) public attestationTimestamp;

    /// @notice Store verification results for external queries
    mapping(bytes32 key => ebool result) private verificationResults;

    // ============ Access Control ============

    /// @notice Owner of the registry
    address public owner;
    /// @notice Pending owner for two-step ownership transfer
    address public pendingOwner;

    /// @notice Authorized registrars who can attest identities
    mapping(address registrar => bool authorized) public registrars;

    /// @notice Thrown when caller lacks permission for encrypted data
    error AccessProhibited();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender]) revert OnlyRegistrar();
        _;
    }

    // ============ Constructor ============

    /// @notice Initializes the registry with the deployer as owner and initial registrar
    constructor() {
        owner = msg.sender;
        registrars[msg.sender] = true;
        emit RegistrarAdded(msg.sender);
    }

    // ============ Registrar Management ============

    /// @inheritdoc IIdentityRegistry
    function addRegistrar(address registrar) external onlyOwner {
        registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    /// @inheritdoc IIdentityRegistry
    function removeRegistrar(address registrar) external onlyOwner {
        registrars[registrar] = false;
        emit RegistrarRemoved(registrar);
    }

    // ============ Identity Attestation ============

    /// @inheritdoc IIdentityRegistry
    function attestIdentity(
        address user,
        externalEuint8 encBirthYearOffset,
        externalEuint16 encCountryCode,
        externalEuint8 encKycLevel,
        externalEbool encIsBlacklisted,
        bytes calldata inputProof
    ) external onlyRegistrar {
        // Convert and store encrypted values
        euint8 birthYear = FHE.fromExternal(encBirthYearOffset, inputProof);
        euint16 country = FHE.fromExternal(encCountryCode, inputProof);
        euint8 kyc = FHE.fromExternal(encKycLevel, inputProof);
        ebool blacklisted = FHE.fromExternal(encIsBlacklisted, inputProof);

        birthYearOffsets[user] = birthYear;
        countryCodes[user] = country;
        kycLevels[user] = kyc;
        isBlacklisted[user] = blacklisted;

        // Grant contract permission to all values
        FHE.allowThis(birthYear);
        FHE.allowThis(country);
        FHE.allowThis(kyc);
        FHE.allowThis(blacklisted);

        // Grant user permission to their own data
        FHE.allow(birthYear, user);
        FHE.allow(country, user);
        FHE.allow(kyc, user);
        FHE.allow(blacklisted, user);

        attestationTimestamp[user] = block.timestamp;

        emit IdentityAttested(user, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function revokeIdentity(address user) external onlyRegistrar {
        if (attestationTimestamp[user] == 0) revert NotAttested();

        // Set encrypted values to encrypted zeros
        birthYearOffsets[user] = FHE.asEuint8(0);
        countryCodes[user] = FHE.asEuint16(0);
        kycLevels[user] = FHE.asEuint8(0);
        isBlacklisted[user] = FHE.asEbool(false);
        attestationTimestamp[user] = 0;

        emit IdentityRevoked(user);
    }

    // ============ Encrypted Queries ============

    /// @inheritdoc IIdentityRegistry
    function getBirthYearOffset(address user) external view returns (euint8) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(birthYearOffsets[user])) revert AccessProhibited();
        return birthYearOffsets[user];
    }

    /// @inheritdoc IIdentityRegistry
    function getCountryCode(address user) external view returns (euint16) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(countryCodes[user])) revert AccessProhibited();
        return countryCodes[user];
    }

    /// @inheritdoc IIdentityRegistry
    function getKycLevel(address user) external view returns (euint8) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(kycLevels[user])) revert AccessProhibited();
        return kycLevels[user];
    }

    /// @inheritdoc IIdentityRegistry
    function getBlacklistStatus(address user) external view returns (ebool) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(isBlacklisted[user])) revert AccessProhibited();
        return isBlacklisted[user];
    }

    // ============ Verification Helpers ============

    /// @inheritdoc IIdentityRegistry
    function hasMinKycLevel(address user, uint8 minLevel) external returns (ebool) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(kycLevels[user])) revert AccessProhibited();
        ebool result = FHE.ge(kycLevels[user], FHE.asEuint8(minLevel));

        // Store result for later retrieval
        bytes32 key = keccak256(abi.encodePacked(user, uint8(0), uint256(minLevel)));
        verificationResults[key] = result;

        // Grant caller permission to decrypt the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    /// @inheritdoc IIdentityRegistry
    function isFromCountry(address user, uint16 country) external returns (ebool) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(countryCodes[user])) revert AccessProhibited();
        ebool result = FHE.eq(countryCodes[user], FHE.asEuint16(country));

        // Store result for later retrieval
        bytes32 key = keccak256(abi.encodePacked(user, uint8(1), uint256(country)));
        verificationResults[key] = result;

        // Grant caller permission to decrypt the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    /// @inheritdoc IIdentityRegistry
    function isNotBlacklisted(address user) external returns (ebool) {
        if (attestationTimestamp[user] == 0) revert NotAttested();
        if (!FHE.isSenderAllowed(isBlacklisted[user])) revert AccessProhibited();
        ebool result = FHE.not(isBlacklisted[user]);

        // Store result for later retrieval
        bytes32 key = keccak256(abi.encodePacked(user, uint8(2), uint256(0)));
        verificationResults[key] = result;

        // Grant caller permission to decrypt the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    // ============ Result Getters ============

    /**
     * @notice Get the last KYC level verification result
     * @param user Address that was checked
     * @param minLevel Level that was checked
     * @return Encrypted boolean result
     */
    function getKycLevelResult(address user, uint8 minLevel) external view returns (ebool) {
        bytes32 key = keccak256(abi.encodePacked(user, uint8(0), uint256(minLevel)));
        ebool result = verificationResults[key];
        if (!FHE.isSenderAllowed(result)) revert AccessProhibited();
        return result;
    }

    /**
     * @notice Get the last country verification result
     * @param user Address that was checked
     * @param country Country code that was checked
     * @return Encrypted boolean result
     */
    function getCountryResult(address user, uint16 country) external view returns (ebool) {
        bytes32 key = keccak256(abi.encodePacked(user, uint8(1), uint256(country)));
        ebool result = verificationResults[key];
        if (!FHE.isSenderAllowed(result)) revert AccessProhibited();
        return result;
    }

    /**
     * @notice Get the last blacklist verification result
     * @param user Address that was checked
     * @return Encrypted boolean result
     */
    function getBlacklistResult(address user) external view returns (ebool) {
        bytes32 key = keccak256(abi.encodePacked(user, uint8(2), uint256(0)));
        ebool result = verificationResults[key];
        if (!FHE.isSenderAllowed(result)) revert AccessProhibited();
        return result;
    }

    // ============ Access Control ============

    /// @inheritdoc IIdentityRegistry
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @inheritdoc IIdentityRegistry
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert OnlyPendingOwner();
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /// @inheritdoc IIdentityRegistry
    function grantAccessTo(address grantee) external {
        if (attestationTimestamp[msg.sender] == 0) revert NotAttested();

        FHE.allow(birthYearOffsets[msg.sender], grantee);
        FHE.allow(countryCodes[msg.sender], grantee);
        FHE.allow(kycLevels[msg.sender], grantee);
        FHE.allow(isBlacklisted[msg.sender], grantee);

        emit AccessGranted(msg.sender, grantee);
    }

    /// @inheritdoc IIdentityRegistry
    function isAttested(address user) external view returns (bool) {
        return attestationTimestamp[user] > 0;
    }
}
```

{% endtab %}

{% tab title="IdentityRegistry.test.ts" %}


```typescript
/**
 * @title IdentityRegistry Tests
 * @notice Tests for the on-chain encrypted identity registry
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("IdentityRegistry", () => {
  let registry: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let owner: HardhatEthersSigner;
  let registrar: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("IdentityRegistry");
    const contract = await factory.deploy();
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
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, signer.address);
    encrypted.add8(birthYearOffset);
    encrypted.add16(countryCode);
    encrypted.add8(kycLevel);
    encrypted.addBool(isBlacklisted);
    const encryptedInput = await encrypted.encrypt();

    await registry
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

  before(async () => {
    [owner, registrar, user1, user2, verifier] = await hre.ethers.getSigners();
    registry = await deployContract();
    contractAddress = await registry.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(registry, "IdentityRegistry");
  });

  describe("Deployment", () => {
    it("should set deployer as owner", async () => {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("should set deployer as initial registrar", async () => {
      expect(await registry.registrars(owner.address)).to.be.true;
    });
  });

  describe("Registrar Management", () => {
    it("should allow owner to add registrar", async () => {
      await expect(registry.connect(owner).addRegistrar(registrar.address))
        .to.emit(registry, "RegistrarAdded")
        .withArgs(registrar.address);

      expect(await registry.registrars(registrar.address)).to.be.true;
    });

    it("should revert when non-owner tries to add registrar", async () => {
      await expect(
        registry.connect(user1).addRegistrar(user2.address),
      ).to.be.revertedWithCustomError(registry, "OnlyOwner");
    });

    it("should allow owner to remove registrar", async () => {
      await registry.connect(owner).addRegistrar(user2.address);

      await expect(registry.connect(owner).removeRegistrar(user2.address))
        .to.emit(registry, "RegistrarRemoved")
        .withArgs(user2.address);

      expect(await registry.registrars(user2.address)).to.be.false;
    });
  });

  describe("Identity Attestation", () => {
    it("should allow registrar to attest identity", async () => {
      // Birth year 1990 (offset 90), USA (840), KYC level 3, not blacklisted
      await attestUser(user1.address, 90, 840, 3, false, registrar);

      expect(await registry.isAttested(user1.address)).to.be.true;

      const timestamp = await registry.attestationTimestamp(user1.address);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("should emit IdentityAttested event", async () => {
      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, registrar.address);
      encrypted.add8(100);
      encrypted.add16(276);
      encrypted.add8(2);
      encrypted.addBool(false);
      const encryptedInput = await encrypted.encrypt();

      await expect(
        registry
          .connect(registrar)
          .attestIdentity(
            user2.address,
            encryptedInput.handles[0],
            encryptedInput.handles[1],
            encryptedInput.handles[2],
            encryptedInput.handles[3],
            encryptedInput.inputProof,
          ),
      )
        .to.emit(registry, "IdentityAttested")
        .withArgs(user2.address, registrar.address);
    });

    it("should revert when non-registrar tries to attest", async () => {
      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user1.address);
      encrypted.add8(100);
      encrypted.add16(840);
      encrypted.add8(1);
      encrypted.addBool(false);
      const encryptedInput = await encrypted.encrypt();

      await expect(
        registry
          .connect(user1)
          .attestIdentity(
            verifier.address,
            encryptedInput.handles[0],
            encryptedInput.handles[1],
            encryptedInput.handles[2],
            encryptedInput.handles[3],
            encryptedInput.inputProof,
          ),
      ).to.be.revertedWithCustomError(registry, "OnlyRegistrar");
    });
  });

  describe("Encrypted Data Retrieval", () => {
    it("should allow user to read their own KYC level", async () => {
      const encryptedKyc = await registry.connect(user1).getKycLevel(user1.address);

      const kycLevel = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedKyc,
        contractAddress,
        user1,
      );

      expect(kycLevel).to.equal(3n);
    });

    it("should allow user to read their own blacklist status", async () => {
      const encryptedBlacklist = await registry.connect(user1).getBlacklistStatus(user1.address);

      const isBlacklisted = await hre.fhevm.userDecryptEbool(
        encryptedBlacklist,
        contractAddress,
        user1,
      );

      expect(isBlacklisted).to.be.false;
    });

    it("should revert for non-attested users", async () => {
      const unattested = (await hre.ethers.getSigners())[5];

      await expect(
        registry.connect(unattested).getBirthYearOffset(unattested.address),
      ).to.be.revertedWithCustomError(registry, "NotAttested");
    });
  });

  describe("Verification Helpers", () => {
    it("should check minimum KYC level correctly", async () => {
      await registry.connect(user1).hasMinKycLevel(user1.address, 2);

      const encryptedHasMinKyc = await registry.connect(user1).getKycLevelResult(user1.address, 2);

      const hasMinKyc = await hre.fhevm.userDecryptEbool(
        encryptedHasMinKyc,
        contractAddress,
        user1,
      );

      expect(hasMinKyc).to.be.true;
    });

    it("should fail KYC check when level is insufficient", async () => {
      await registry.connect(user1).hasMinKycLevel(user1.address, 5);

      const encryptedHasMinKyc = await registry.connect(user1).getKycLevelResult(user1.address, 5);

      const hasMinKyc = await hre.fhevm.userDecryptEbool(
        encryptedHasMinKyc,
        contractAddress,
        user1,
      );

      expect(hasMinKyc).to.be.false;
    });

    it("should check not-blacklisted status", async () => {
      await registry.connect(user1).isNotBlacklisted(user1.address);

      const encryptedNotBlacklisted = await registry
        .connect(user1)
        .getBlacklistResult(user1.address);

      const isNotBlacklisted = await hre.fhevm.userDecryptEbool(
        encryptedNotBlacklisted,
        contractAddress,
        user1,
      );

      expect(isNotBlacklisted).to.be.true;
    });
  });

  describe("Access Control Grants", () => {
    it("should block verifier from reading user data without grant", async () => {
      await expect(
        registry.connect(verifier).getKycLevel(user1.address),
      ).to.be.revertedWithCustomError(registry, "AccessProhibited");
    });

    it("should allow user to grant access to verifier", async () => {
      await expect(registry.connect(user1).grantAccessTo(verifier.address))
        .to.emit(registry, "AccessGranted")
        .withArgs(user1.address, verifier.address);
    });

    it("should allow verifier to read user data after grant", async () => {
      const encryptedKyc = await registry.connect(verifier).getKycLevel(user1.address);

      const kycLevel = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedKyc,
        contractAddress,
        verifier,
      );

      expect(kycLevel).to.equal(3n);
    });
  });

  describe("Identity Revocation", () => {
    it("should allow registrar to revoke identity", async () => {
      expect(await registry.isAttested(user2.address)).to.be.true;

      await expect(registry.connect(registrar).revokeIdentity(user2.address))
        .to.emit(registry, "IdentityRevoked")
        .withArgs(user2.address);

      expect(await registry.isAttested(user2.address)).to.be.false;
    });

    it("should revert when revoking non-attested user", async () => {
      const unattested = (await hre.ethers.getSigners())[7];

      await expect(
        registry.connect(registrar).revokeIdentity(unattested.address),
      ).to.be.revertedWithCustomError(registry, "NotAttested");
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

On-chain encrypted identity registry for KYC or compliance platforms

### Developer Notes

Example for fhEVM Examples - Identity Category

### attestationTimestamp

```solidity
mapping(address => uint256) attestationTimestamp
```

Timestamp of last attestation

### owner

```solidity
address owner
```

Owner of the registry

### pendingOwner

```solidity
address pendingOwner
```

Pending owner for two-step ownership transfer

### registrars

```solidity
mapping(address => bool) registrars
```

Authorized registrars who can attest identities

### AccessProhibited

```solidity
error AccessProhibited()
```

Thrown when caller lacks permission for encrypted data

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlyRegistrar

```solidity
modifier onlyRegistrar()
```

### constructor

```solidity
constructor() public
```

Initializes the registry with the deployer as owner and initial registrar

### addRegistrar

```solidity
function addRegistrar(address registrar) external
```

Add a new authorized registrar

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address to authorize as registrar |

### removeRegistrar

```solidity
function removeRegistrar(address registrar) external
```

Remove an authorized registrar

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address to remove from registrars |

### attestIdentity

```solidity
function attestIdentity(address user, externalEuint8 encBirthYearOffset, externalEuint16 encCountryCode, externalEuint8 encKycLevel, externalEbool encIsBlacklisted, bytes inputProof) external
```

Attest a user's encrypted identity data on-chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user being attested |
| encBirthYearOffset | externalEuint8 | Encrypted birth year offset (years since 1900) |
| encCountryCode | externalEuint16 | Encrypted ISO 3166-1 numeric country code |
| encKycLevel | externalEuint8 | Encrypted KYC verification level (0-3) |
| encIsBlacklisted | externalEbool | Encrypted blacklist status |
| inputProof | bytes | FHE proof for encrypted inputs |

### revokeIdentity

```solidity
function revokeIdentity(address user) external
```

Revoke a user's identity attestation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user to revoke |

### getBirthYearOffset

```solidity
function getBirthYearOffset(address user) external view returns (euint8)
```

Get user's encrypted birth year offset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | Encrypted birth year offset (years since 1900) |

### getCountryCode

```solidity
function getCountryCode(address user) external view returns (euint16)
```

Get user's encrypted country code

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint16 | Encrypted ISO 3166-1 numeric country code |

### getKycLevel

```solidity
function getKycLevel(address user) external view returns (euint8)
```

Get user's encrypted KYC level

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | Encrypted KYC verification level (0-3) |

### getBlacklistStatus

```solidity
function getBlacklistStatus(address user) external view returns (ebool)
```

Get user's encrypted blacklist status

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted blacklist status (true if blacklisted) |

### hasMinKycLevel

```solidity
function hasMinKycLevel(address user, uint8 minLevel) external returns (ebool)
```

Check if user has minimum KYC level (encrypted comparison)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |
| minLevel | uint8 | Minimum KYC level required |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result of comparison |

### isFromCountry

```solidity
function isFromCountry(address user, uint16 country) external returns (ebool)
```

Check if user is from a specific country (encrypted comparison)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |
| country | uint16 | ISO 3166-1 numeric country code to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result of comparison |

### isNotBlacklisted

```solidity
function isNotBlacklisted(address user) external returns (ebool)
```

Check if user is not blacklisted (encrypted)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean (true if NOT blacklisted) |

### getKycLevelResult

```solidity
function getKycLevelResult(address user, uint8 minLevel) external view returns (ebool)
```

Get the last KYC level verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |
| minLevel | uint8 | Level that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### getCountryResult

```solidity
function getCountryResult(address user, uint16 country) external view returns (ebool)
```

Get the last country verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |
| country | uint16 | Country code that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### getBlacklistResult

```solidity
function getBlacklistResult(address user) external view returns (ebool)
```

Get the last blacklist verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

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

### grantAccessTo

```solidity
function grantAccessTo(address grantee) external
```

Grant a contract access to caller's encrypted identity data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| grantee | address | Address to grant access to |

### isAttested

```solidity
function isAttested(address user) external view returns (bool)
```

Check if a user has been attested

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if user has valid attestation |
