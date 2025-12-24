/**
 * @title AntiPatternViewOnEncrypted Tests
 * @notice Tests for the view-on-encrypted-values pitfall
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("AntiPatternViewOnEncrypted", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let user: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("AntiPatternViewOnEncrypted");
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
    await hre.fhevm.assertCoprocessorInitialized(contract, "AntiPatternViewOnEncrypted");
  });

  it("returns an encrypted handle even in a view call (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    encrypted.add64(15);
    const input = await encrypted.encrypt();

    await contract.connect(user).storeValue(input.handles[0], input.inputProof);

    const encryptedResult = await contract.getEncryptedValue(user.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      user,
    );

    expect(clear).to.equal(15n);
  });
});
