/**
 * @title ERC7984Example Tests
 * @notice Tests minimal ERC7984 confidential token flows
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984Example", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984Example");
    const deployed = await factory.deploy(owner.address);
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    token = await deployToken();
    tokenAddress = await token.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984Example");
  });

  it("mints and transfers confidential balances", async () => {
    const mintInput = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    mintInput.add64(100);
    const mintPayload = await mintInput.encrypt();

    await token.connect(owner).mint(alice.address, mintPayload.handles[0], mintPayload.inputProof);

    const aliceBalanceEncrypted = await token.confidentialBalanceOf(alice.address);
    const aliceBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalanceEncrypted,
      tokenAddress,
      alice,
    );

    expect(aliceBalance).to.equal(100n);

    const transferInput = hre.fhevm.createEncryptedInput(tokenAddress, alice.address);
    transferInput.add64(40);
    const transferPayload = await transferInput.encrypt();

    await token
      .connect(alice)
      ["confidentialTransfer(address,bytes32,bytes)"](
        bob.address,
        transferPayload.handles[0],
        transferPayload.inputProof,
      );

    const aliceBalanceEncryptedAfter = await token.confidentialBalanceOf(alice.address);
    const bobBalanceEncrypted = await token.confidentialBalanceOf(bob.address);

    const aliceBalanceAfter = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalanceEncryptedAfter,
      tokenAddress,
      alice,
    );
    const bobBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      bobBalanceEncrypted,
      tokenAddress,
      bob,
    );

    expect(aliceBalanceAfter).to.equal(60n);
    expect(bobBalance).to.equal(40n);
  });
});
