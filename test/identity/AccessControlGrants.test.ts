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
