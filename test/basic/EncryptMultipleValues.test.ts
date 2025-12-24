/**
 * @title EncryptMultipleValues Tests
 * @notice Tests for storing multiple encrypted values
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("EncryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("EncryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "EncryptMultipleValues");
  });

  it("stores and decrypts both values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    encrypted.add64(22);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValues(input.handles[0], input.handles[1], input.inputProof);

    const [encryptedFirst, encryptedSecond] = await contract.getValues(user.address);
    const clearFirst = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedFirst,
      contractAddress,
      user,
    );
    const clearSecond = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSecond,
      contractAddress,
      user,
    );

    expect(clearFirst).to.equal(10n);
    expect(clearSecond).to.equal(22n);
  });
});
