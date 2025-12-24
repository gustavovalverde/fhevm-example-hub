/**
 * @title FHEEq Tests
 * @notice Tests for encrypted equality comparisons
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEEq", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHEEq");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHEEq");
  });

  it("returns true for equal values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(7);
    encrypted.add64(7);
    const input = await encrypted.encrypt();

    await contract.connect(user).compare(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user);
    expect(clear).to.equal(true);
  });

  it("returns false for different values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(7);
    encrypted.add64(9);
    const input = await encrypted.encrypt();

    await contract.connect(user).compare(input.handles[0], input.handles[1], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEbool(encryptedResult, contractAddress, user);
    expect(clear).to.equal(false);
  });
});
