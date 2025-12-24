/**
 * @title FHECounter Tests
 * @notice Tests for the encrypted counter example
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHECounter", () => {
  let counter: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHECounter");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    counter = await deployContract();
    contractAddress = await counter.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(counter, "FHECounter");
  });

  it("increments the counter", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(5);
    const input = await encrypted.encrypt();

    await counter.connect(user).increment(input.handles[0], input.inputProof);

    const encryptedCount = await counter.getCount();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedCount,
      contractAddress,
      user,
    );

    expect(clear).to.equal(5n);
  });

  it("decrements the counter", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    await counter.connect(user).increment(input.handles[0], input.inputProof);
    await counter.connect(user).decrement(input.handles[0], input.inputProof);

    const encryptedCount = await counter.getCount();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedCount,
      contractAddress,
      user,
    );

    expect(clear).to.equal(0n);
  });
});
