/**
 * @title SwapERC7984ToERC20 Tests
 * @notice Tests swapping confidential ERC7984 amounts to public ERC20 via public decryption
 * @dev Includes failure modes: missing operator, missing allowTransient, missing publish
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("SwapERC7984ToERC20", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let token: Awaited<ReturnType<typeof deployConfidentialToken>>;
  let erc20: Awaited<ReturnType<typeof deployERC20>>;
  let swap: Awaited<ReturnType<typeof deploySwap>>;

  let tokenAddress: string;
  let erc20Address: string;
  let swapAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployKyc() {
    const factory = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return contract;
  }

  async function deployConfidentialToken() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(
      owner.address,
      "Mock Confidential Token",
      "mCONF",
      "ipfs://mintable-erc7984",
    );
    await contract.waitForDeployment();
    return contract;
  }

  async function deployERC20() {
    const factory = await hre.ethers.getContractFactory("MockERC20");
    const contract = await factory.deploy(owner.address, 0);
    await contract.waitForDeployment();
    return contract;
  }

  async function deploySwap() {
    const factory = await hre.ethers.getContractFactory("SwapERC7984ToERC20");
    const contract = await factory.deploy(
      owner.address,
      tokenAddress,
      erc20Address,
      await kyc.getAddress(),
    );
    await contract.waitForDeployment();
    return contract;
  }

  async function mintConfidential(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  function findTransferHandle(receipt: any, from: string, to: string) {
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

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    await kyc.connect(owner).setKyc(alice.address, true);

    token = await deployConfidentialToken();
    tokenAddress = await token.getAddress();

    erc20 = await deployERC20();
    erc20Address = await erc20.getAddress();

    swap = await deploySwap();
    swapAddress = await swap.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(swap, "SwapERC7984ToERC20");

    // Fund swap with ERC20 for payouts
    await erc20.connect(owner).mint(swapAddress, 1_000_000);

    await mintConfidential(alice.address, 500_000);
  });

  it("should revert swap if user is not KYC-approved", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, bob.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(bob).swapConfidentialToERC20(input.handles[0], input.inputProof)).to
      .be.reverted;
  });

  it("should revert swap if operator approval is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(alice).swapConfidentialToERC20(input.handles[0], input.inputProof)).to
      .be.reverted;
  });

  it("should swap and finalize with public decrypt proof", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    await token.connect(alice).setOperator(swapAddress, Number(now + 24n * 60n * 60n));

    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(123_456);
    const input = await encrypted.encrypt();

    const tx = await swap
      .connect(alice)
      .swapConfidentialToERC20(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);
    const decrypted = await hre.fhevm.publicDecrypt([transferredHandle]);
    const clear = decrypted.clearValues[transferredHandle as `0x${string}`] as bigint;

    await swap.finalizeSwap(transferredHandle, Number(clear), decrypted.decryptionProof);

    expect(await erc20.balanceOf(alice.address)).to.equal(clear);
  });

  it("should revert when omitting allowTransient for the token (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(swap.connect(alice).swapWithoutAllowingToken(input.handles[0], input.inputProof))
      .to.be.reverted;
  });

  it("should make finalization impossible if amountTransferred isn't published (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(2);
    const input = await encrypted.encrypt();

    const tx = await swap.connect(alice).swapWithoutPublishing(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);

    let failed = false;
    try {
      await hre.fhevm.publicDecrypt([transferredHandle]);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("should reject finalization if the cleartext doesn't match the proof (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(3);
    const input = await encrypted.encrypt();

    const tx = await swap
      .connect(alice)
      .swapConfidentialToERC20(input.handles[0], input.inputProof);
    const receipt = await tx.wait();

    const transferredHandle = findTransferHandle(receipt, alice.address, swapAddress);
    const decrypted = await hre.fhevm.publicDecrypt([transferredHandle]);
    const clear = decrypted.clearValues[transferredHandle as `0x${string}`] as bigint;

    await expect(
      swap.finalizeSwap(transferredHandle, Number(clear + 1n), decrypted.decryptionProof),
    ).to.be.reverted;
  });
});
