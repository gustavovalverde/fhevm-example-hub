/**
 * @title SwapERC7984ToERC7984 Tests
 * @notice Tests swapping between two confidential ERC7984 tokens
 * @dev Includes failure modes around operator approval and missing allowTransient
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("SwapERC7984ToERC7984", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let tokenA: Awaited<ReturnType<typeof deployTokenA>>;
  let tokenB: Awaited<ReturnType<typeof deployTokenB>>;
  let swap: Awaited<ReturnType<typeof deploySwap>>;

  let tokenAAddress: string;
  let tokenBAddress: string;
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

  async function deployTokenA() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(owner.address, "Token A", "TKA", "ipfs://token-a");
    await contract.waitForDeployment();
    return contract;
  }

  async function deployTokenB() {
    const factory = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const contract = await factory.deploy(owner.address, "Token B", "TKB", "ipfs://token-b");
    await contract.waitForDeployment();
    return contract;
  }

  async function deploySwap() {
    const factory = await hre.ethers.getContractFactory("SwapERC7984ToERC7984");
    const contract = await factory.deploy(await kyc.getAddress());
    await contract.waitForDeployment();
    return contract;
  }

  async function mint(token: typeof tokenA, to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(await token.getAddress(), owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(token: typeof tokenA, holder: HardhatEthersSigner) {
    const addr = await token.getAddress();
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, addr, holder);
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    await kyc.connect(owner).setKyc(alice.address, true);

    tokenA = await deployTokenA();
    tokenAAddress = await tokenA.getAddress();

    tokenB = await deployTokenB();
    tokenBAddress = await tokenB.getAddress();

    swap = await deploySwap();
    swapAddress = await swap.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(tokenA, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(tokenB, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(swap, "SwapERC7984ToERC7984");

    await mint(tokenA, alice.address, 1_000);
    await mint(tokenB, swapAddress, 1_000);
  });

  it("should revert if user is not KYC-approved", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, bob.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(bob)
        .swapConfidentialForConfidential(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should revert if operator approval is missing (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(10);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapConfidentialForConfidential(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should swap confidential balances with allowTransient", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    await tokenA.connect(alice).setOperator(swapAddress, Number(now + 24n * 60n * 60n));

    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(100);
    const input = await encrypted.encrypt();

    await swap
      .connect(alice)
      .swapConfidentialForConfidential(
        tokenAAddress,
        tokenBAddress,
        input.handles[0],
        input.inputProof,
      );

    const aA = await decryptBalance(tokenA, alice);
    const aB = await decryptBalance(tokenB, alice);

    expect(aA).to.equal(900n);
    expect(aB).to.equal(100n);
  });

  it("should revert if omitting allowTransient for the toToken (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapWithoutAllowingToToken(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });

  it("should revert if omitting allowTransient for the fromToken (pitfall)", async () => {
    const encrypted = hre.fhevm.createEncryptedInput(swapAddress, alice.address);
    encrypted.add64(1);
    const input = await encrypted.encrypt();

    await expect(
      swap
        .connect(alice)
        .swapWithoutAllowingFromToken(
          tokenAAddress,
          tokenBAddress,
          input.handles[0],
          input.inputProof,
        ),
    ).to.be.reverted;
  });
});
