# AccessControlGrants

> **Category**: Identity | **Difficulty**: Intermediate | **Chapters**: Access Control | **Concept**: User-controlled FHE.allow() permissions

> 📚 [View API Reference](../reference/identity/AccessControlGrants.md)

Demonstrates user-controlled FHE.allow() permission patterns

## Why this example

This example focuses on **User-controlled FHE.allow() permissions**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/identity/AccessControlGrants.test.ts
```

## Dependencies

None



## Contract and test

{% tabs %}

{% tab title="AccessControlGrants.sol" %}


```solidity
// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time
pragma solidity ^0.8.24;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AccessControlGrants
 * @author Gustavo Valverde
 * @notice Demonstrates user-controlled FHE.allow() permission patterns
 * @dev Example for fhEVM Examples - Identity Category
 *
 * @custom:category identity
 * @custom:chapter access-control
 * @custom:concept User-controlled FHE.allow() permissions
 * @custom:difficulty intermediate
 *
 * This contract shows how users can granularly control access to their
 * encrypted data. Users can grant and revoke access to specific parties
 * for specific data fields.
 *
 * Key patterns demonstrated:
 * 1. FHE.allow() for granting read access
 * 2. Tiered access control (view encrypted, decrypt, modify)
 * 3. Time-limited access grants
 * 4. Multi-party access coordination
 */
contract AccessControlGrants is ZamaEthereumConfig {
    // ============ Data Structures ============

    /// @notice Encrypted user credential score
    mapping(address user => euint8 score) private credentialScores;

    /// @notice Track which addresses have been granted access
    mapping(address owner => mapping(address grantee => bool granted)) public hasAccess;

    /// @notice Track time-limited access grants
    mapping(address owner => mapping(address grantee => uint256 expiry)) public accessExpiry;

    /// @notice Store list of grantees for each user (for enumeration)
    mapping(address owner => address[] grantees) private granteeList;

    /// @notice Store last comparison result for retrieval
    /// @dev Key is keccak256(user1, user2) to support different comparisons
    mapping(bytes32 key => ebool result) private comparisonResults;

    // ============ Events ============

    /**
     * @notice Emitted when a user stores their credential score
     * @param user The address of the user who stored their credential
     */
    event CredentialStored(address indexed user);

    /**
     * @notice Emitted when access is granted to another address
     * @param owner The data owner granting access
     * @param grantee The address receiving access
     */
    event AccessGranted(address indexed owner, address indexed grantee);

    /**
     * @notice Emitted when access is revoked from an address
     * @param owner The data owner revoking access
     * @param grantee The address losing access
     */
    event AccessRevoked(address indexed owner, address indexed grantee);

    /**
     * @notice Emitted when time-limited access is granted
     * @param owner The data owner granting access
     * @param grantee The address receiving access
     * @param expiry The timestamp when access expires
     */
    event TimedAccessGranted(address indexed owner, address indexed grantee, uint256 indexed expiry);

    // ============ Errors ============

    error NoCredential();
    error AlreadyGranted();
    error NotGranted();
    error AccessExpired();

    // ============ Core Functions ============

    /**
     * @notice Store an encrypted credential score
     * @dev Demonstrates: Basic encrypted storage with self-access
     * @param encryptedScore Encrypted credential score (0-255)
     * @param inputProof Proof for the encrypted input
     */
    function storeCredential(
        externalEuint8 encryptedScore,
        bytes calldata inputProof
    ) external {
        euint8 score = FHE.fromExternal(encryptedScore, inputProof);

        credentialScores[msg.sender] = score;

        // Grant contract permission (required for operations)
        FHE.allowThis(score);

        // Grant owner permission (can always access own data)
        FHE.allow(score, msg.sender);

        emit CredentialStored(msg.sender);
    }

    /**
     * @notice Grant permanent access to another address
     * @dev Demonstrates: FHE.allow() for access delegation
     * @param grantee Address to grant access to
     *
     * After calling this, grantee can decrypt the credential score
     */
    function grantAccess(address grantee) external {
        if (!FHE.isInitialized(credentialScores[msg.sender])) {
            revert NoCredential();
        }
        if (hasAccess[msg.sender][grantee]) {
            revert AlreadyGranted();
        }

        // Grant access to the encrypted value
        FHE.allow(credentialScores[msg.sender], grantee);

        hasAccess[msg.sender][grantee] = true;
        granteeList[msg.sender].push(grantee);

        emit AccessGranted(msg.sender, grantee);
    }

    /**
     * @notice Grant time-limited access
     * @dev Demonstrates: Combining FHE access with expiry checks
     * @param grantee Address to grant access to
     * @param duration Duration in seconds
     *
     * Note: FHE.allow() is permanent, but we track expiry off-chain
     * and check it before returning data
     */
    function grantTimedAccess(address grantee, uint256 duration) external {
        if (!FHE.isInitialized(credentialScores[msg.sender])) {
            revert NoCredential();
        }

        // Grant FHE access
        FHE.allow(credentialScores[msg.sender], grantee);

        // Track expiry
        accessExpiry[msg.sender][grantee] = block.timestamp + duration;
        hasAccess[msg.sender][grantee] = true;

        if (findGranteeIndex(msg.sender, grantee) == type(uint256).max) {
            granteeList[msg.sender].push(grantee);
        }

        emit TimedAccessGranted(msg.sender, grantee, block.timestamp + duration);
    }

    /**
     * @notice Revoke access from a grantee
     * @dev Note: FHE access cannot be revoked on-chain, but we can
     * prevent contract-level access and update a new encrypted value
     * @param grantee Address to revoke access from
     */
    function revokeAccess(address grantee) external {
        if (!hasAccess[msg.sender][grantee]) {
            revert NotGranted();
        }

        hasAccess[msg.sender][grantee] = false;
        accessExpiry[msg.sender][grantee] = 0;

        // Remove from grantee list
        uint256 index = findGranteeIndex(msg.sender, grantee);
        if (index != type(uint256).max) {
            address[] storage list = granteeList[msg.sender];
            list[index] = list[list.length - 1];
            list.pop();
        }

        emit AccessRevoked(msg.sender, grantee);
    }

    /**
     * @notice Get credential score (with access check)
     * @dev Demonstrates: Access-controlled encrypted data retrieval
     * @param owner Address whose credential to retrieve
     * @return Encrypted credential score
     */
    function getCredential(address owner) external view returns (euint8) {
        if (!FHE.isInitialized(credentialScores[owner])) {
            revert NoCredential();
        }

        // Check if caller has access (owner always has access)
        if (msg.sender != owner) {
            if (!hasAccess[owner][msg.sender]) {
                revert NotGranted();
            }

            // Check if timed access has expired
            uint256 expiry = accessExpiry[owner][msg.sender];
            if (expiry != 0 && block.timestamp > expiry) {
                revert AccessExpired();
            }
        }

        return credentialScores[owner];
    }

    /**
     * @notice Compare two users' credentials (both must grant access)
     * @dev Demonstrates: Multi-party access for encrypted comparison
     * @param user1 First user
     * @param user2 Second user
     * @return Encrypted boolean (true if user1 >= user2)
     *
     * Both users must have granted access to msg.sender for this to work
     */
    function compareCredentials(
        address user1,
        address user2
    ) external returns (ebool) {
        // Verify access to both
        if (msg.sender != user1) {
            if (!hasAccess[user1][msg.sender]) {
                revert NotGranted();
            }

            uint256 expiry1 = accessExpiry[user1][msg.sender];
            if (expiry1 != 0 && block.timestamp > expiry1) {
                revert AccessExpired();
            }
        }

        if (msg.sender != user2) {
            if (!hasAccess[user2][msg.sender]) {
                revert NotGranted();
            }

            uint256 expiry2 = accessExpiry[user2][msg.sender];
            if (expiry2 != 0 && block.timestamp > expiry2) {
                revert AccessExpired();
            }
        }

        euint8 score1 = credentialScores[user1];
        euint8 score2 = credentialScores[user2];

        if (!FHE.isInitialized(score1) || !FHE.isInitialized(score2)) {
            revert NoCredential();
        }

        ebool result = FHE.ge(score1, score2);

        // Store result for later retrieval
        bytes32 key = keccak256(abi.encodePacked(user1, user2));
        comparisonResults[key] = result;

        // Grant caller permission to decrypt the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    /**
     * @notice Get the last comparison result between two users
     * @dev Call compareCredentials first to compute and store the result
     * @param user1 First user
     * @param user2 Second user
     * @return Encrypted boolean result
     */
    function getComparisonResult(address user1, address user2) external view returns (ebool) {
        bytes32 key = keccak256(abi.encodePacked(user1, user2));
        return comparisonResults[key];
    }

    // ============ View Functions ============

    /**
     * @notice Check if a grantee has valid access
     * @param owner Address of data owner
     * @param grantee Address to check
     * @return Whether grantee has valid (non-expired) access
     */
    function hasValidAccess(
        address owner,
        address grantee
    ) external view returns (bool) {
        if (!hasAccess[owner][grantee]) {
            return false;
        }

        uint256 expiry = accessExpiry[owner][grantee];
        if (expiry != 0 && block.timestamp > expiry) {
            return false;
        }

        return true;
    }

    /**
     * @notice Get all grantees for a user
     * @param owner Address of data owner
     * @return Array of grantee addresses
     */
    function getGrantees(address owner) external view returns (address[] memory) {
        return granteeList[owner];
    }

    /**
     * @notice Check if user has a credential stored
     * @param user Address to check
     * @return Whether user has stored credential
     */
    function hasCredential(address user) external view returns (bool) {
        return FHE.isInitialized(credentialScores[user]);
    }

    // ============ Internal Functions ============

    /**
     * @notice Find the index of a grantee in the grantee list
     * @param owner The data owner
     * @param grantee The grantee to find
     * @return index The index of the grantee, or type(uint256).max if not found
     */
    function findGranteeIndex(
        address owner,
        address grantee
    ) internal view returns (uint256 index) {
        address[] storage list = granteeList[owner];
        for (uint256 i = 0; i < list.length; ++i) {
            if (list[i] == grantee) {
                return i;
            }
        }
        return type(uint256).max;
    }
}
```

{% endtab %}

{% tab title="AccessControlGrants.test.ts" %}


```typescript
/**
 * @title AccessControlGrants Tests
 * @notice Tests for user-controlled FHE.allow() permission patterns
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("AccessControlGrants", () => {
  let accessControl: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let grantee: HardhatEthersSigner;
  let cachedCredentialForGrantee: any;
  let cachedCredentialForTimedGrantee: any;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AccessControlGrants");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [owner, user1, user2, grantee] = await hre.ethers.getSigners();
    accessControl = await deployContract();
    contractAddress = await accessControl.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(accessControl, "AccessControlGrants");
  });

  describe("Credential Storage", () => {
    it("should allow users to store encrypted credentials", async () => {
      const credentialScore = 85;

      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user1.address);
      encrypted.add8(credentialScore);
      const encryptedInput = await encrypted.encrypt();

      await accessControl
        .connect(user1)
        .storeCredential(encryptedInput.handles[0], encryptedInput.inputProof);

      expect(await accessControl.hasCredential(user1.address)).to.be.true;
    });

    it("should track credential status correctly", async () => {
      expect(await accessControl.hasCredential(user1.address)).to.be.true;
      expect(await accessControl.hasCredential(user2.address)).to.be.false;
    });

    it("should allow owner to read their own credential", async () => {
      const encryptedScore = await accessControl.connect(user1).getCredential(user1.address);

      const score = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedScore,
        contractAddress,
        user1,
      );

      expect(score).to.equal(85n);
    });
  });

  describe("Access Grants", () => {
    it("should allow user to grant access to grantee", async () => {
      expect(await accessControl.hasAccess(user1.address, grantee.address)).to.be.false;

      await accessControl.connect(user1).grantAccess(grantee.address);

      expect(await accessControl.hasAccess(user1.address, grantee.address)).to.be.true;
    });

    it("should revert when granting access twice", async () => {
      await expect(
        accessControl.connect(user1).grantAccess(grantee.address),
      ).to.be.revertedWithCustomError(accessControl, "AlreadyGranted");
    });

    it("should allow grantee to read user credential", async () => {
      const encryptedScore = await accessControl.connect(grantee).getCredential(user1.address);
      cachedCredentialForGrantee = encryptedScore;

      const score = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedScore,
        contractAddress,
        grantee,
      );

      expect(score).to.equal(85n);
    });

    it("should track grantees correctly", async () => {
      const grantees = await accessControl.getGrantees(user1.address);
      expect(grantees).to.include(grantee.address);
    });

    it("should revert for users without access", async () => {
      await expect(
        accessControl.connect(user2).getCredential(user1.address),
      ).to.be.revertedWithCustomError(accessControl, "NotGranted");
    });
  });

  describe("Timed Access Grants", () => {
    let timedGrantee: HardhatEthersSigner;

    before(async () => {
      timedGrantee = (await hre.ethers.getSigners())[4];
    });

    it("should allow timed access grants", async () => {
      const duration = 3600; // 1 hour

      await accessControl.connect(user1).grantTimedAccess(timedGrantee.address, duration);

      expect(await accessControl.hasValidAccess(user1.address, timedGrantee.address)).to.be.true;
    });

    it("should allow access within time window", async () => {
      const encryptedScore = await accessControl.connect(timedGrantee).getCredential(user1.address);
      cachedCredentialForTimedGrantee = encryptedScore;

      const score = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedScore,
        contractAddress,
        timedGrantee,
      );

      expect(score).to.equal(85n);
    });

    it("should expire access after time window", async () => {
      // Fast forward time by more than 1 hour
      await time.increase(3601);

      expect(await accessControl.hasValidAccess(user1.address, timedGrantee.address)).to.be.false;

      await expect(
        accessControl.connect(timedGrantee).getCredential(user1.address),
      ).to.be.revertedWithCustomError(accessControl, "AccessExpired");

      // Pitfall: FHE.allow() is permanent, so previously obtained ciphertext is still decryptable.
      const score = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        cachedCredentialForTimedGrantee,
        contractAddress,
        timedGrantee,
      );
      expect(score).to.equal(85n);
    });
  });

  describe("Access Revocation", () => {
    it("should allow user to revoke access", async () => {
      expect(await accessControl.hasAccess(user1.address, grantee.address)).to.be.true;

      await accessControl.connect(user1).revokeAccess(grantee.address);

      expect(await accessControl.hasAccess(user1.address, grantee.address)).to.be.false;
    });

    it("should still allow decrypting previously obtained ciphertext after revocation (pitfall)", async () => {
      const score = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        cachedCredentialForGrantee,
        contractAddress,
        grantee,
      );
      expect(score).to.equal(85n);
    });

    it("should revert when revoking non-existent access", async () => {
      await expect(
        accessControl.connect(user1).revokeAccess(grantee.address),
      ).to.be.revertedWithCustomError(accessControl, "NotGranted");
    });

    it("should remove revoked grantee from list", async () => {
      const grantees = await accessControl.getGrantees(user1.address);
      expect(grantees).to.not.include(grantee.address);
    });
  });

  describe("Multi-Party Comparisons", () => {
    before(async () => {
      // Store credential for user2
      const credentialScore = 90;
      const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user2.address);
      encrypted.add8(credentialScore);
      const encryptedInput = await encrypted.encrypt();

      await accessControl
        .connect(user2)
        .storeCredential(encryptedInput.handles[0], encryptedInput.inputProof);

      // Both users grant access to owner for comparison
      await accessControl.connect(user1).grantAccess(owner.address);
      await accessControl.connect(user2).grantAccess(owner.address);
    });

    it("should allow comparing credentials when both users grant access", async () => {
      // user1 has score 85, user2 has score 90
      // Call function to compute and store result (also sets permissions)
      await accessControl.connect(owner).compareCredentials(user1.address, user2.address);

      // Get stored result via view function
      const encryptedResult = await accessControl.getComparisonResult(user1.address, user2.address);

      // Decrypt using userDecryptEbool (permissions were set by the call)
      const user1GreaterOrEqual = await hre.fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        owner,
      );

      // 85 >= 90 is false
      expect(user1GreaterOrEqual).to.be.false;
    });

    it("should revert comparison without access", async () => {
      const noAccessUser = (await hre.ethers.getSigners())[5];

      await expect(
        accessControl.connect(noAccessUser).compareCredentials(user1.address, user2.address),
      ).to.be.revertedWithCustomError(accessControl, "NotGranted");
    });
  });

  describe("Edge Cases", () => {
    it("should revert when granting access without credential", async () => {
      const noCredentialUser = (await hre.ethers.getSigners())[6];

      await expect(
        accessControl.connect(noCredentialUser).grantAccess(grantee.address),
      ).to.be.revertedWithCustomError(accessControl, "NoCredential");
    });

    it("should revert when getting non-existent credential", async () => {
      const noCredentialUser = (await hre.ethers.getSigners())[7];

      await expect(
        accessControl.getCredential(noCredentialUser.address),
      ).to.be.revertedWithCustomError(accessControl, "NoCredential");
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

- should still allow decrypting previously obtained ciphertext after revocation
