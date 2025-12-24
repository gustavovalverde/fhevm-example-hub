/**
 * @title HandleLifecycle Tests
 * @notice Tests for reusing encrypted handles across calls
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("HandleLifecycle", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("HandleLifecycle");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "HandleLifecycle");
  });

  it("stores and reuses encrypted handles", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const increment = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    increment.add64(7);
    const addInput = await increment.encrypt();

    await contract.connect(user).addToStored(addInput.handles[0], addInput.inputProof);

    const encryptedValue = await contract.getStoredValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedValue,
      contractAddress,
      user,
    );

    expect(clear).to.equal(17n);
  });
});
