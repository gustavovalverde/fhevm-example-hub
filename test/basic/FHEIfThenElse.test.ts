/**
 * @title FHEIfThenElse Tests
 * @notice Tests encrypted conditional selection with FHE.select
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEIfThenElse", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("FHEIfThenElse");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "FHEIfThenElse");
  });

  it("picks the left value when left <= threshold", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    encrypted.add64(99);
    encrypted.add64(20);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .choose(input.handles[0], input.handles[1], input.handles[2], input.inputProof);

    const result = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      result,
      contractAddress,
      user,
    );

    expect(clear).to.equal(10n);
  });

  it("picks the right value when left > threshold", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(42);
    encrypted.add64(7);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .choose(input.handles[0], input.handles[1], input.handles[2], input.inputProof);

    const result = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      result,
      contractAddress,
      user,
    );

    expect(clear).to.equal(7n);
  });
});
