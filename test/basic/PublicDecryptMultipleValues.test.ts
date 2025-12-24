/**
 * @title PublicDecryptMultipleValues Tests
 * @notice Tests for public decryption of multiple values
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("PublicDecryptMultipleValues", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("PublicDecryptMultipleValues");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "PublicDecryptMultipleValues");
  });

  it("publishes multiple encrypted values", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(5);
    encrypted.add64(9);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValues(input.handles[0], input.handles[1], input.inputProof);
    await contract.publishValues();

    const [handleA, handleB] = await contract.getValueHandles();
    const decrypted = await hre.fhevm.publicDecrypt([handleA, handleB]);
    const clearA = decrypted.clearValues[handleA as `0x${string}`] as bigint;
    const clearB = decrypted.clearValues[handleB as `0x${string}`] as bigint;

    expect(clearA).to.equal(5n);
    expect(clearB).to.equal(9n);
  });
});
