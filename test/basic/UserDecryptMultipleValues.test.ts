/**
 * @title UserDecryptMultipleValues Tests
 * @notice Tests for decrypting multiple encrypted results
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("UserDecryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("UserDecryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "UserDecryptMultipleValues");
  });

  it("returns encrypted sum and difference", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(50);
    encrypted.add64(8);
    const input = await encrypted.encrypt();

    await contract
      .connect(user)
      .computeSumAndDifference(input.handles[0], input.handles[1], input.inputProof);

    const encryptedSum = await contract.getLastSum();
    const encryptedDiff = await contract.getLastDifference();

    const sum = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSum,
      contractAddress,
      user,
    );
    const diff = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedDiff,
      contractAddress,
      user,
    );

    expect(sum).to.equal(58n);
    expect(diff).to.equal(42n);
  });
});
