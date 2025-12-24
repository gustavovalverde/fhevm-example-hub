/**
 * @title HandleGeneration Tests
 * @notice Tests handle creation and derived handles without plaintext
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("HandleGeneration", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("HandleGeneration");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "HandleGeneration");
  });

  it("derives a new handle via symbolic execution", async () => {
    const zeroHash = `0x${"0".repeat(64)}`;
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    await contract.connect(user).deriveValue(5);

    const storedHandle = await contract.getStoredHandle(user.address);
    const derivedHandle = await contract.getDerivedHandle(user.address);

    expect(storedHandle).to.not.equal(zeroHash);
    expect(derivedHandle).to.not.equal(zeroHash);

    const derivedValue = await contract.getDerivedValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      derivedValue,
      contractAddress,
      user,
    );

    expect(clear).to.equal(30n);
  });
});
