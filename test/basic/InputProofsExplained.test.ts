/**
 * @title InputProofsExplained Tests
 * @notice Tests for input proof binding to contract and signer
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("InputProofsExplained", () => {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let otherContract: Awaited<ReturnType<typeof deployContract>>;
  let contractAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployContract() {
    const factory = await hre.ethers.getContractFactory("InputProofsExplained");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [, alice, bob] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    contract = await deployContract();
    otherContract = await deployContract();
    contractAddress = await contract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(contract, "InputProofsExplained");
    await hre.fhevm.assertCoprocessorInitialized(otherContract, "InputProofsExplained");
  });

  it("stores a secret for the correct sender", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(777);
    const input = await encrypted.encrypt();

    await contract.connect(alice).storeSecret(input.handles[0], input.inputProof);

    const encryptedSecret = await contract.getSecret(alice.address);
    const clear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedSecret,
      contractAddress,
      alice,
    );

    expect(clear).to.equal(777n);
  });

  it("rejects a proof bound to a different sender (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(contract.connect(bob).storeSecret(input.handles[0], input.inputProof)).to.be
      .reverted;
  });

  it("rejects a proof bound to a different contract (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(contractAddress, alice.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    await expect(otherContract.connect(alice).storeSecret(input.handles[0], input.inputProof)).to.be
      .reverted;
  });
});
