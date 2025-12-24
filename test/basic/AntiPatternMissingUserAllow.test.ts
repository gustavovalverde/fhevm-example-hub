/**
 * @title AntiPatternMissingUserAllow Tests
 * @notice Tests the missing user allow pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternMissingUserAllow", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternMissingUserAllow");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    contract = await deployContract();
    contractAddress = await contract.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternMissingUserAllow");
  });

  it("fails to decrypt when FHE.allow(user) is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(123);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const stored = await contract.getStoredValue(user.address);

    let failed = false;
    try {
      await hre.fhevm.userDecryptEuint(FhevmType.euint64, stored, contractAddress, user);
    } catch (_error) {
      failed = true;
    }

    expect(failed).to.equal(true);
  });
});
