/**
 * @title TransientAccessControl Tests
 * @notice Tests for `FHE.allowTransient()` cross-contract patterns
 * @dev Demonstrates both the correct flow and common pitfalls
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("TransientAccessControl", () => {
  let registry: Awaited<ReturnType<typeof deployRegistry>>;
  let consumer: Awaited<ReturnType<typeof deployConsumer>>;
  let registryAddress: string;
  let consumerAddress: string;

  let user: HardhatEthersSigner;

  async function deployRegistry() {
    const factory = await hre.ethers.getContractFactory("TransientAccessRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  async function deployConsumer() {
    const factory = await hre.ethers.getContractFactory("TransientScoreConsumer");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  before(async () => {
    [, user] = await hre.ethers.getSigners();

    registry = await deployRegistry();
    consumer = await deployConsumer();

    registryAddress = await registry.getAddress();
    consumerAddress = await consumer.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(registry, "TransientAccessRegistry");
    await hre.fhevm.assertCoprocessorInitialized(consumer, "TransientScoreConsumer");
  });

  async function storeScore(score: number) {
    const encrypted = hre.fhevm.createEncryptedInput(registryAddress, user.address);
    encrypted.add8(score);
    const encryptedInput = await encrypted.encrypt();

    await registry.connect(user).storeScore(encryptedInput.handles[0], encryptedInput.inputProof);
  }

  it("should allow a consumer contract to compute when the registry uses allowTransient", async () => {
    await storeScore(80);

    await consumer.connect(user).checkAtLeastWithTransient(registryAddress, user.address, 50);

    const encryptedOk = await consumer.getLastResult(user.address);

    const ok = await hre.fhevm.userDecryptEbool(encryptedOk, consumerAddress, user);
    expect(ok).to.equal(true);
  });

  it("should revert when the registry does not grant transient permission (pitfall)", async () => {
    await storeScore(80);

    await expect(
      consumer.connect(user).checkAtLeastWithoutTransient(registryAddress, user.address, 50),
    ).to.be.reverted;
  });

  it("should show that cached handles outlive transient permissions (pitfall)", async () => {
    await storeScore(80);

    // This call succeeds because the registry grants transient permission within this tx.
    await consumer.connect(user).cacheScoreWithTransient(registryAddress, user.address);

    // In a new tx, the consumer no longer has permission on the cached handle.
    await expect(consumer.connect(user).useCachedScore(50)).to.be.reverted;
  });
});
