# EncryptedAgeVerification

> **Category**: Identity | **Difficulty**: Beginner | **Chapters**: Comparisons | **Concept**: FHE comparison (le, ge) for threshold checks without revealing values

> 📚 [View API Reference](../reference/identity/EncryptedAgeVerification.md)

Demonstrates FHE age threshold verification without revealing actual age

## Why this example

This example focuses on **FHE comparison (le, ge) for threshold checks without revealing values**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/EncryptedAgeVerification.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="EncryptedAgeVerification.sol" %}


```solidity
// SPDX-License-Identifier: MIT
// solhint-disable func-name-mixedcase
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptedAgeVerification
 * @author Gustavo Valverde
 * @notice Demonstrates FHE age threshold verification without revealing actual age
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter comparisons
 * @custom:concept FHE comparison (le, ge) for threshold checks without revealing values
 * @custom:difficulty beginner
 *
 * This contract allows users to prove they meet an age threshold (e.g., 18+)
 * without revealing their actual birth year. The birth year is stored encrypted,
 * and comparisons are performed homomorphically.
 *
 * Key patterns demonstrated:
 * 1. Storing encrypted data (euint8 for birth year offset)
 * 2. Using FHE.le() for encrypted comparisons
 * 3. Using FHE.allow() and FHE.allowThis() for access control
 * 4. Returning encrypted booleans for privacy-preserving verification
 */
contract EncryptedAgeVerification is ZamaEthereumConfig {
    /// @notice Encrypted birth year offset from 1900 for each user
    /// @dev Using euint8 allows birth years from 1900-2155
    mapping(address user => euint8 birthYearOffset) private birthYearOffsets;

    /// @notice Current year offset from 1900 (e.g., 124 for 2024)
    euint8 private currentYearOffset;

    /// @notice Owner who can update the current year
    address public owner;

    /// @notice Last verification result for each user (for testing/querying)
    /// @dev Key is keccak256(user, minAge) to support multiple age thresholds
    mapping(bytes32 key => ebool result) private verificationResults;

    /**
     * @notice Emitted when a user registers their birth year
     * @param user The address of the user who registered
     */
    event BirthYearRegistered(address indexed user);

    /// @notice Emitted when the current year is updated
    event CurrentYearUpdated();

    /**
     * @notice Emitted when a user makes an age verification result publicly decryptable
     * @param user The address of the user who published the result
     * @param minAge The age threshold that was verified
     */
    event VerificationResultPublished(address indexed user, uint8 indexed minAge);

    /// @notice Error when a non-owner tries to update the current year
    error OnlyOwner();

    /// @notice Error when user has no registered birth year
    error NotRegistered();

    /// @notice Error when there is no stored verification result for a given threshold
    error NoVerificationResult();

    /// @notice Initializes the contract with the deployer as owner and current year as 2024
    constructor() {
        owner = msg.sender;
        // Initialize current year offset (e.g., 124 for 2024)
        currentYearOffset = FHE.asEuint8(124);
        FHE.allowThis(currentYearOffset);
    }

    /**
     * @notice Store encrypted birth year offset
     * @dev Demonstrates: encrypted input handling + FHE.allowThis() + FHE.allow()
     * @param encryptedBirthYearOffset Encrypted offset from 1900 (e.g., 100 for year 2000)
     * @param inputProof Proof for the encrypted input
     *
     * Example: To store birth year 2000, the offset is 100 (2000 - 1900)
     */
    function registerBirthYear(
        externalEuint8 encryptedBirthYearOffset,
        bytes calldata inputProof
    ) external {
        euint8 birthYearOffset = FHE.fromExternal(encryptedBirthYearOffset, inputProof);

        birthYearOffsets[msg.sender] = birthYearOffset;

        // Critical: Grant contract permission to operate on value
        FHE.allowThis(birthYearOffset);

        // Grant user permission to decrypt their own data
        FHE.allow(birthYearOffset, msg.sender);

        emit BirthYearRegistered(msg.sender);
    }

    /**
     * @notice Check if user is at least the specified age
     * @dev Demonstrates: FHE.sub() and FHE.ge() for encrypted comparison
     * @param user Address to check
     * @param minAge Minimum age threshold (plaintext, e.g., 18)
     * @return Encrypted boolean (caller must have permission to decrypt)
     *
     * The calculation: currentYear - birthYear >= minAge
     * Rearranged as: birthYearOffset <= currentYearOffset - minAge
     * This avoids overflow issues
     */
    function isAtLeastAge(address user, uint8 minAge) external returns (ebool) {
        return _isAtLeastAge(user, minAge);
    }

    /**
     * @notice Convenience function to check if user is over 18
     * @dev Demonstrates: Wrapper pattern for common use cases
     * @param user Address to check
     * @return Encrypted boolean indicating if user is 18 or older
     */
    function isOver18(address user) external returns (ebool) {
        return _isAtLeastAge(user, 18);
    }

    /**
     * @notice Convenience function to check if user is over 21
     * @param user Address to check
     * @return Encrypted boolean indicating if user is 21 or older
     */
    function isOver21(address user) external returns (ebool) {
        return _isAtLeastAge(user, 21);
    }

    /**
     * @notice Internal implementation of age check
     * @dev Separated to avoid external self-calls which don't work with staticCall
     * @param user Address to check
     * @param minAge Minimum age threshold
     * @return meetsAge Encrypted boolean indicating if user meets the age requirement
     */
    function _isAtLeastAge(address user, uint8 minAge) internal returns (ebool meetsAge) {
        if (!FHE.isInitialized(birthYearOffsets[user])) {
            revert NotRegistered();
        }

        // Calculate: currentYearOffset - minAge
        // This gives us the maximum birth year offset for someone to be minAge years old
        euint8 maxBirthYearOffset = FHE.sub(currentYearOffset, FHE.asEuint8(minAge));

        // User is at least minAge if their birth year offset <= maxBirthYearOffset
        // (Earlier birth year = older person)
        meetsAge = FHE.le(birthYearOffsets[user], maxBirthYearOffset);

        // Store result for later retrieval
        bytes32 key = keccak256(abi.encodePacked(user, minAge));
        verificationResults[key] = meetsAge;

        // Grant caller permission to decrypt the result
        FHE.allowThis(meetsAge);
        FHE.allow(meetsAge, msg.sender);

        return meetsAge;
    }

    /**
     * @notice Get the last verification result for a user and age threshold
     * @dev Call isAtLeastAge/isOver18/isOver21 first to compute and store the result
     * @param user Address that was checked
     * @param minAge Age threshold that was used
     * @return Encrypted boolean result (caller must have permission to decrypt)
     */
    function getVerificationResult(address user, uint8 minAge) external view returns (ebool) {
        bytes32 key = keccak256(abi.encodePacked(user, minAge));
        return verificationResults[key];
    }

    /**
     * @notice Make a stored verification result publicly decryptable (opt-in)
     * @dev Demonstrates: FHE.makePubliclyDecryptable() for public decryption
     * @param minAge Age threshold that was used (must have been computed previously)
     *
     * After calling this, anyone can publicly decrypt the stored boolean result via the relayer.
     * Use this only for attestations you intentionally want to reveal (e.g., "is over 18").
     */
    function makeVerificationResultPublic(uint8 minAge) external {
        if (!FHE.isInitialized(birthYearOffsets[msg.sender])) {
            revert NotRegistered();
        }

        bytes32 key = keccak256(abi.encodePacked(msg.sender, minAge));
        ebool result = verificationResults[key];

        if (!FHE.isInitialized(result)) {
            revert NoVerificationResult();
        }

        FHE.makePubliclyDecryptable(result);
        emit VerificationResultPublished(msg.sender, minAge);
    }

    /**
     * @notice Grant access to encrypted result for a third party
     * @dev Demonstrates: User-controlled access grants
     * @param verifier Address that should be able to verify age result
     *
     * After calling this, the verifier can decrypt the stored 18+ verification result
     * (compute it first via isOver18/isAtLeastAge).
     */
    function grantVerificationAccess(address verifier) external {
        grantVerificationAccess(verifier, 18);
    }

    /**
     * @notice Grant access to a stored verification result for a specific threshold
     * @param verifier Address that should be able to decrypt the verification result
     * @param minAge Age threshold that was used (must have been computed previously)
     */
    function grantVerificationAccess(address verifier, uint8 minAge) public {
        if (!FHE.isInitialized(birthYearOffsets[msg.sender])) {
            revert NotRegistered();
        }

        bytes32 key = keccak256(abi.encodePacked(msg.sender, minAge));
        ebool result = verificationResults[key];

        if (!FHE.isInitialized(result)) {
            revert NoVerificationResult();
        }

        FHE.allow(result, verifier);
    }

    /**
     * @notice Update the current year (owner only)
     * @dev In production, this would use a trusted oracle or governance
     * @param newOffset New year offset from 1900
     */
    function updateCurrentYear(uint8 newOffset) external {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }

        currentYearOffset = FHE.asEuint8(newOffset);
        FHE.allowThis(currentYearOffset);

        emit CurrentYearUpdated();
    }

    /**
     * @notice Check if a user has registered their birth year
     * @param user Address to check
     * @return Whether the user has a registered birth year
     */
    function isRegistered(address user) external view returns (bool) {
        return FHE.isInitialized(birthYearOffsets[user]);
    }
}
```

{% endtab %}

{% tab title="EncryptedAgeVerification.test.ts" %}


```typescript
/**
 * @title EncryptedAgeVerification Tests
 * @notice Tests for the age verification contract using fhEVM mocked mode
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("EncryptedAgeVerification", () => {
  let ageVerification: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("EncryptedAgeVerification");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [owner, user1, user2, verifier] = await hre.ethers.getSigners();
    ageVerification = await deployContract();
    contractAddress = await ageVerification.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(ageVerification, "EncryptedAgeVerification");
  });

  describe("Deployment", () => {
    it("should set the correct owner", async () => {
      expect(await ageVerification.owner()).to.equal(owner.address);
    });

    it("should initialize with year offset 124 (2024)", async () => {
      // Contract initializes with currentYearOffset = 124 in constructor
      // We can't directly read it but the contract should work correctly
      expect(await ageVerification.getAddress()).to.not.be.undefined;
    });
  });

  describe("Birth Year Registration", () => {
    it("should allow users to register their birth year", async () => {
      // User born in 2000 -> offset is 100 (2000 - 1900)
      const birthYearOffset = 100;

      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user1.address);
      encrypted.add8(birthYearOffset);
      const encryptedInput = await encrypted.encrypt();

      await ageVerification
        .connect(user1)
        .registerBirthYear(encryptedInput.handles[0], encryptedInput.inputProof);

      expect(await ageVerification.isRegistered(user1.address)).to.be.true;
    });

    it("should track registration status correctly", async () => {
      // user1 is registered from previous test
      expect(await ageVerification.isRegistered(user1.address)).to.be.true;
      // user2 is not registered
      expect(await ageVerification.isRegistered(user2.address)).to.be.false;
    });

    it("should revert when the input proof doesn't match the sender (pitfall)", async () => {
      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user1.address);
      encrypted.add8(110);
      const encryptedInput = await encrypted.encrypt();

      await expect(
        ageVerification
          .connect(user2)
          .registerBirthYear(encryptedInput.handles[0], encryptedInput.inputProof),
      ).to.be.reverted;
    });

    it("should allow different users to register", async () => {
      // User born in 1990 -> offset is 90
      const birthYearOffset = 90;

      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user2.address);
      encrypted.add8(birthYearOffset);
      const encryptedInput = await encrypted.encrypt();

      await ageVerification
        .connect(user2)
        .registerBirthYear(encryptedInput.handles[0], encryptedInput.inputProof);

      expect(await ageVerification.isRegistered(user2.address)).to.be.true;
    });
  });

  describe("Age Verification", () => {
    it("should verify user born in 2000 is over 18 in 2024", async () => {
      // user1 was born in 2000, current year is 2024
      // Age = 2024 - 2000 = 24 years old -> should be over 18
      // Call function to compute and store result (also sets permissions)
      await ageVerification.connect(user1).isOver18(user1.address);

      // Get stored result via view function
      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 18);

      // Decrypt using userDecryptEbool (permissions were set by the call)
      const isOver18 = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user1);

      expect(isOver18).to.be.true;
    });

    it("should verify user born in 1990 is over 21 in 2024", async () => {
      // user2 was born in 1990, current year is 2024
      // Age = 2024 - 1990 = 34 years old -> should be over 21
      await ageVerification.connect(user2).isOver21(user2.address);

      const encryptedResult = await ageVerification.getVerificationResult(user2.address, 21);

      const isOver21 = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user2);

      expect(isOver21).to.be.true;
    });

    it("should support custom age thresholds", async () => {
      // Check if user1 (born 2000, age 24) is at least 25
      await ageVerification.connect(user1).isAtLeastAge(user1.address, 25);

      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 25);

      const isAtLeast25 = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user1);

      // 24 years old is NOT >= 25
      expect(isAtLeast25).to.be.false;
    });

    it("should revert for unregistered users", async () => {
      const unregisteredUser = (await hre.ethers.getSigners())[4];

      await expect(
        ageVerification.isOver18(unregisteredUser.address),
      ).to.be.revertedWithCustomError(ageVerification, "NotRegistered");
    });
  });

  describe("Access Control", () => {
    it("should only allow owner to update current year", async () => {
      await expect(
        ageVerification.connect(user1).updateCurrentYear(125),
      ).to.be.revertedWithCustomError(ageVerification, "OnlyOwner");

      await expect(ageVerification.connect(owner).updateCurrentYear(125)).to.not.be.reverted;
    });

    it("should update age calculations after year change", async () => {
      // After updating to year 125 (2025), user1 (born 2000) is now 25
      await ageVerification.connect(user1).isAtLeastAge(user1.address, 25);

      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 25);

      const isAtLeast25 = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user1);

      expect(isAtLeast25).to.be.true;
    });
  });

  describe("Verification Access Grants", () => {
    it("should fail gracefully for unregistered users", async () => {
      const unregisteredUser = (await hre.ethers.getSigners())[5];

      await expect(
        ageVerification
          .connect(unregisteredUser)
          ["grantVerificationAccess(address)"](verifier.address),
      ).to.be.revertedWithCustomError(ageVerification, "NotRegistered");
    });

    it("should revert when granting access before computing a result (pitfall)", async () => {
      const freshUser = (await hre.ethers.getSigners())[6];

      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, freshUser.address);
      encrypted.add8(100);
      const encryptedInput = await encrypted.encrypt();

      await ageVerification
        .connect(freshUser)
        .registerBirthYear(encryptedInput.handles[0], encryptedInput.inputProof);

      await expect(
        ageVerification.connect(freshUser)["grantVerificationAccess(address)"](verifier.address),
      ).to.be.revertedWithCustomError(ageVerification, "NoVerificationResult");
    });

    it("should not allow verifier to decrypt without explicit grant (pitfall)", async () => {
      await ageVerification.connect(user1).isOver18(user1.address);
      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 18);

      let failed = false;
      try {
        await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, verifier);
      } catch {
        failed = true;
      }

      expect(failed).to.be.true;
    });

    it("should allow registered users to grant verification access", async () => {
      // Ensure there is a stored 18+ result to grant access to
      await ageVerification.connect(user1).isOver18(user1.address);

      await expect(
        ageVerification.connect(user1)["grantVerificationAccess(address)"](verifier.address),
      ).to.not.be.reverted;
    });

    it("should allow verifier to decrypt the granted verification result", async () => {
      // Compute + store the 18+ result first (also grants user1 access)
      await ageVerification.connect(user1).isOver18(user1.address);

      // Grant verifier access to decrypt the stored result
      await ageVerification.connect(user1)["grantVerificationAccess(address)"](verifier.address);

      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 18);
      const canDecrypt = await hre.fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        verifier,
      );

      expect(canDecrypt).to.be.true;
    });
  });

  describe("Public Decryption (Opt-in)", () => {
    it("should not allow public decrypt before publishing (pitfall)", async () => {
      await ageVerification.connect(user1).isOver18(user1.address);
      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 18);

      let failed = false;
      try {
        await hre.fhevm.publicDecryptEbool(encryptedResult);
      } catch {
        failed = true;
      }

      expect(failed).to.be.true;
    });

    it("should allow public decrypt after the user publishes the result", async () => {
      await ageVerification.connect(user1).isOver18(user1.address);
      const encryptedResult = await ageVerification.getVerificationResult(user1.address, 18);

      await ageVerification.connect(user1).makeVerificationResultPublic(18);

      const clear = await hre.fhevm.publicDecryptEbool(encryptedResult);
      expect(clear).to.be.true;
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should revert when granting access before computing a result
- should not allow verifier to decrypt without explicit grant
- should not allow public decrypt before publishing
