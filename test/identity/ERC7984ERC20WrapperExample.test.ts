/**
 * @title ERC7984ERC20WrapperExample Tests
 * @notice Tests ERC20 ↔ ERC7984 wrapping with public decryption finalization
 * @dev Includes KYC gating and common pitfalls (public decrypt not available unless published)
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984ERC20WrapperExample", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let usdc: Awaited<ReturnType<typeof deployUSDC>>;
  let wrapper: Awaited<ReturnType<typeof deployWrapper>>;

  let kycAddress: string;
  let usdcAddress: string;
  let wrapperAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  async function deployKyc() {
    const factory = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployUSDC() {
    const factory = await hre.ethers.getContractFactory("MockUSDC");
    const contract = await factory.deploy(alice.address, 2_000_000);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployWrapper() {
    const factory = await hre.ethers.getContractFactory("ERC7984ERC20WrapperExample");
    const contract = await factory.deploy(owner.address, usdcAddress, kycAddress);
    await contract.waitForDeployment();
    return contract;
  }

  async function decryptWrapperBalance(holder: HardhatEthersSigner) {
    const handle = await wrapper.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, wrapperAddress, holder);
  }

  function findUnwrapAmountHandle(receipt: any) {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== wrapperAddress.toLowerCase()) continue;
      try {
        const parsed = wrapper.interface.parseLog(log);
        if (parsed?.name !== "UnwrapRequested") continue;
        const [, amount] = parsed.args;
        return amount as string;
      } catch {
        // ignore
      }
    }
    throw new Error("UnwrapRequested event not found");
  }

  before(async () => {
    [owner, alice, bob, carol] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    kycAddress = await kyc.getAddress();

    usdc = await deployUSDC();
    usdcAddress = await usdc.getAddress();

    wrapper = await deployWrapper();
    wrapperAddress = await wrapper.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(wrapper, "ERC7984ERC20WrapperExample");

    await kyc.connect(owner).setKyc(alice.address, true);
    await kyc.connect(owner).setKyc(bob.address, true);
  });

  it("should reject wrapping for non-KYC users (pitfall)", async () => {
    await expect(wrapper.connect(carol).wrap(carol.address, 1)).to.be.reverted;
  });

  it("should allow wrap for KYC users and mint confidential balance", async () => {
    await usdc.connect(alice).approve(wrapperAddress, 1_000_000);
    await wrapper.connect(alice).wrap(alice.address, 1_000_000);

    const bal = await decryptWrapperBalance(alice);
    expect(bal).to.equal(1_000_000n);
  });

  it("should not allow public decrypt of confidential balances (pitfall)", async () => {
    const handle = await wrapper.confidentialBalanceOf(alice.address);

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([handle]);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("should unwrap via public decryption finalization", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(400_000);
    const input = await encrypted.encrypt();

    const tx = await wrapper
      .connect(alice)
      ["unwrap(address,address,bytes32,bytes)"](
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof,
      );
    const receipt = await tx.wait();

    const burntAmountHandle = findUnwrapAmountHandle(receipt);
    const decrypted = await hre.fhevm.publicDecrypt([burntAmountHandle]);
    const clear = decrypted.clearValues[burntAmountHandle as `0x${string}`] as bigint;

    await wrapper.finalizeUnwrap(burntAmountHandle, Number(clear), decrypted.decryptionProof);

    expect(await usdc.balanceOf(bob.address)).to.equal(400_000n);
  });

  it("should revert finalization if the cleartext doesn't match the proof (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    const tx = await wrapper
      .connect(alice)
      ["unwrap(address,address,bytes32,bytes)"](
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof,
      );
    const receipt = await tx.wait();

    const burntAmountHandle = findUnwrapAmountHandle(receipt);
    const decrypted = await hre.fhevm.publicDecrypt([burntAmountHandle]);
    const clear = decrypted.clearValues[burntAmountHandle as `0x${string}`] as bigint;

    await expect(
      wrapper.finalizeUnwrap(burntAmountHandle, Number(clear + 1n), decrypted.decryptionProof),
    ).to.be.reverted;
  });

  it("should reject unwrap to non-KYC recipients", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(wrapperAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      wrapper
        .connect(alice)
        ["unwrap(address,address,bytes32,bytes)"](
          alice.address,
          carol.address,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });
});
