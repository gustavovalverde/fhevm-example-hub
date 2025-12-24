/**
 * @title VestingWalletConfidentialExample Tests
 * @notice Tests confidential vesting wallet releases gated by public KYC
 * @dev Uses factory + clones (recommended pattern)
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("VestingWalletConfidentialExample", () => {
  let kyc: Awaited<ReturnType<typeof deployKyc>>;
  let token: Awaited<ReturnType<typeof deployToken>>;
  let factory: Awaited<ReturnType<typeof deployFactory>>;

  let tokenAddress: string;

  let owner: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;

  async function deployKyc() {
    const f = await hre.ethers.getContractFactory("SimpleKycRegistry");
    const c = await f.deploy(owner.address);
    await c.waitForDeployment();
    return c;
  }

  async function deployToken() {
    const f = await hre.ethers.getContractFactory("MintableConfidentialToken");
    const c = await f.deploy(
      owner.address,
      "Vesting Confidential Token",
      "vCONF",
      "ipfs://vesting-token",
    );
    await c.waitForDeployment();
    return c;
  }

  async function deployFactory() {
    const f = await hre.ethers.getContractFactory("VestingWalletConfidentialExampleFactory");
    const c = await f.deploy(await kyc.getAddress());
    await c.waitForDeployment();
    return c;
  }

  async function mintTo(to: string, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(tokenAddress, owner.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await token.connect(owner).mint(to, input.handles[0], input.inputProof);
  }

  async function decryptBalance(holder: HardhatEthersSigner) {
    const handle = await token.confidentialBalanceOf(holder.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, holder);
  }

  before(async () => {
    [owner, beneficiary] = await hre.ethers.getSigners();

    kyc = await deployKyc();
    token = await deployToken();
    tokenAddress = await token.getAddress();
    factory = await deployFactory();

    await hre.fhevm.assertCoprocessorInitialized(token, "MintableConfidentialToken");
    await hre.fhevm.assertCoprocessorInitialized(
      factory,
      "VestingWalletConfidentialExampleFactory",
    );
  });

  it("should create a vesting wallet clone", async () => {
    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 0],
    );

    const predicted = await factory.predictVestingWalletConfidential(initArgs);
    const tx = await factory.createVestingWalletConfidential(initArgs);
    await tx.wait();

    expect(predicted).to.not.equal("0x0000000000000000000000000000000000000000");
  });

  it("should block releases when beneficiary is not KYC-approved", async () => {
    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 1],
    );
    const walletAddress = await factory.createVestingWalletConfidential.staticCall(initArgs);
    await (await factory.createVestingWalletConfidential(initArgs)).wait();

    await mintTo(walletAddress, 100_000);

    const wallet = await hre.ethers.getContractAt("KycVestingWalletConfidential", walletAddress);

    await expect(wallet.release(tokenAddress)).to.be.reverted;
  });

  it("should allow releases after KYC approval", async () => {
    await kyc.connect(owner).setKyc(beneficiary.address, true);

    const initArgs = hre.ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint48", "uint48"],
      [beneficiary.address, 0, 2],
    );
    const walletAddress = await factory.createVestingWalletConfidential.staticCall(initArgs);
    await (await factory.createVestingWalletConfidential(initArgs)).wait();

    await mintTo(walletAddress, 200_000);

    const wallet = await hre.ethers.getContractAt("KycVestingWalletConfidential", walletAddress);
    await wallet.release(tokenAddress);

    const bal = await decryptBalance(beneficiary);
    expect(bal).to.equal(200_000n);
  });
});
