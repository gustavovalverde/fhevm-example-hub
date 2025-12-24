/**
 * @title PublicDecryptSingleValue Tests
 * @notice Tests for public decryption of a single value
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("PublicDecryptSingleValue", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("PublicDecryptSingleValue");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "PublicDecryptSingleValue");
  });

  it("publishes an encrypted value for public decrypt", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(88);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    await contract.publishValue();

    const handle = await contract.getValueHandle();
    const decrypted = await hre.fhevm.publicDecrypt([handle]);
    const clear = decrypted.clearValues[handle as `0x${string}`] as bigint;

    expect(clear).to.equal(88n);
  });

  it("should not allow public decrypt before publishing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);
    const handle = await contract.getValueHandle();

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([handle]);
    } catch {
      failed = true;
    }

    expect(failed).to.equal(true);
  });
});
