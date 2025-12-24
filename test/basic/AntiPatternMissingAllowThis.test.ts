/**
 * @title AntiPatternMissingAllowThis Tests
 * @notice Tests for the missing FHE.allowThis pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternMissingAllowThis", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternMissingAllowThis");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternMissingAllowThis");
  });

  it("should fail when reusing a handle without allowThis (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(3);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const increment = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    increment.add64(1);
    const incInput = await increment.encrypt();

    await expect(contract.connect(user).addToStored(incInput.handles[0], incInput.inputProof)).to.be
      .reverted;
  });
});
