/**
 * @title ERC7984KycRestricted Tests
 * @notice Tests public KYC allowlist enforcement on an ERC7984 token
 * @dev Uses OpenZeppelin Confidential Contracts + fhEVM mocked mode
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC7984KycRestricted", () => {
  let token: Awaited<ReturnType<typeof deployToken>>;
  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  async function deployToken() {
    const factory = await hre.ethers.getContractFactory("ERC7984KycRestricted");
    const contract = await factory.deploy(owner.address, "KYC Token", "KYCT", "ipfs://kyc-token");
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
    await token
      .connect(from)
      ["confidentialTransfer(address,bytes32,bytes)"](to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(holder: HardhatEthersSigner) {
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, holder);
  }

  before(async () => {
    [owner, alice, bob, carol] = await hre.ethers.getSigners();
    token = await deployToken();
    tokenAddress = await token.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(token, "ERC7984KycRestricted");
  });

  it("should reject minting to non-KYC accounts (pitfall)", async () => {
    await expect(mintTo(alice.address, 1_000_000)).to.be.reverted;
  });

  it("should allow owner to approve KYC and mint", async () => {
    await token.connect(owner).approveKyc(alice.address);
    await token.connect(owner).approveKyc(bob.address);

    await expect(mintTo(alice.address, 1_000_000)).to.not.be.reverted;

    const aliceBal = await decryptBalance(alice);
    expect(aliceBal).to.equal(1_000_000n);
  });

  it("should allow transfers between KYC-approved users", async () => {
    await transfer(alice, bob.address, 250_000);

    const aliceBal = await decryptBalance(alice);
    const bobBal = await decryptBalance(bob);

    expect(aliceBal).to.equal(750_000n);
    expect(bobBal).to.equal(250_000n);
  });

  it("should revert transfers to non-KYC recipients (pitfall)", async () => {
    await expect(transfer(alice, carol.address, 1)).to.be.reverted;
  });

  it("should revert transfers from users whose KYC was revoked", async () => {
    await token.connect(owner).revokeKyc(alice.address);

    await expect(transfer(alice, bob.address, 1)).to.be.reverted;
  });
});
