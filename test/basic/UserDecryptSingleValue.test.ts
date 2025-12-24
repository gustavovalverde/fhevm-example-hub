/**
 * @title UserDecryptSingleValue Tests
 * @notice Tests for user decryption of a single encrypted result
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("UserDecryptSingleValue", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("UserDecryptSingleValue");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "UserDecryptSingleValue");
  });

  it("returns an encrypted result the user can decrypt", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(41);
    const input = await encrypted.encrypt();

    await contract.connect(user).computePlusOne(input.handles[0], input.inputProof);

    const encryptedResult = await contract.getLastResult();
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      user,
    );

    expect(clear).to.equal(42n);
  });
});
