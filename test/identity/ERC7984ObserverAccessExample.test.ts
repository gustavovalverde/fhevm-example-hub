/**
 * @title ERC7984ObserverAccessExample Tests
 * @notice Tests observer (audit) access for confidential balances and transfer amounts
 * @dev Demonstrates the permanent-ACL pitfall: past ciphertext access cannot be revoked
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ZeroAddress } from "ethers";
import hre from "hardhat";

describe("ERC7984ObserverAccessExample", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984ObserverAccessExample");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function mintTo(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function transfer(from: HardhatEthersSigner, to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, from.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    const tx = await token
      .connect(from)
      ["confidentialTransfer(address,bytes32,bytes)"](to, input.handles[0], input.inputProof);
    return await tx.wait();
  }

  function findTransferHandle(
    receipt: Awaited<ReturnType<typeof transfer>>,
    from: string,
    to: string,
  ) {
    if (!receipt) throw new Error("Receipt is null");
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
      try {
        const parsed = token.interface.parseLog(log);
        if (parsed?.name !== "ConfidentialTransfer") continue;
        const [evtFrom, evtTo, transferred] = parsed.args;
        if (evtFrom === from && evtTo === to) return transferred as string;
      } catch {
        // ignore
      }
    }
    throw new Error("ConfidentialTransfer event not found");
  }

  async function decrypt(handle: string, signer: HardhatEthersSigner) {
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, signer);
  }

  before(async () => {
    [owner, alice, bob, auditor] = await hre.ethers.getSigners();
    token = await deployToken();
    tokenAddress = await token.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984ObserverAccessExample");
  });

  it("should allow an observer to decrypt the user's balance after opt-in", async () => {
    await mintTo(alice.address, 1_000_000);

    await token.connect(alice).setObserver(alice.address, auditor.address);

    const aliceBalanceHandle = await token.confidentialBalanceOf(alice.address);
    const clear = await decrypt(aliceBalanceHandle, auditor);
    expect(clear).to.equal(1_000_000n);
  });

  it("should allow an observer to decrypt transfer amount handles involving the user", async () => {
    const receipt = await transfer(alice, bob.address, 250_000);
    const transferredHandle = findTransferHandle(receipt, alice.address, bob.address);

    const clearTransferred = await decrypt(transferredHandle, auditor);
    expect(clearTransferred).to.equal(250_000n);
  });

  it("should not grant future access after observer removal, but old ciphertext stays decryptable (pitfall)", async () => {
    const oldBalanceHandle = await token.confidentialBalanceOf(alice.address);
    const oldClear = await decrypt(oldBalanceHandle, auditor);
    expect(oldClear).to.equal(750_000n);

    await token.connect(alice).setObserver(alice.address, ZeroAddress);

    // Trigger a balance update so Alice gets a new balance handle.
    await transfer(alice, bob.address, 1);

    const newBalanceHandle = await token.confidentialBalanceOf(alice.address);

    let failed = false;
    try {
      await decrypt(newBalanceHandle, auditor);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);

    // Previously obtained ciphertext remains decryptable.
    const stillClear = await decrypt(oldBalanceHandle, auditor);
    expect(stillClear).to.equal(750_000n);
  });
});
