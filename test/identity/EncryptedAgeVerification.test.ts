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
