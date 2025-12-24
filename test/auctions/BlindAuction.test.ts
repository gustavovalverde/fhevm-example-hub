/**
 * @title BlindAuction Tests
 * @notice Tests for sealed-bid auction flow
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("BlindAuction", () => {
  let auction: Awaited<ReturnType<typeof deployAuction>>;
  let paymentToken: Awaited<ReturnType<typeof deployPaymentToken>>;
  let prizeItem: Awaited<ReturnType<typeof deployPrizeItem>>;
  let auctionAddress: string;
  let paymentTokenAddress: string;
  let prizeItemAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  async function deployPaymentToken() {
    const factory = await hre.ethers.getContractFactory("AuctionPaymentToken");
    const deployed = await factory.deploy(owner.address, "Auction USD", "AUSD", "");
    await deployed.waitForDeployment();
    return deployed;
  }

  async function deployPrizeItem() {
    const factory = await hre.ethers.getContractFactory("PrizeItem");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  async function deployAuction(
    nftAddress: string,
    tokenAddress: string,
    tokenId: number,
    startTime: number,
    endTime: number,
  ) {
    const factory = await hre.ethers.getContractFactory("BlindAuction");
    const deployed = await factory.deploy(nftAddress, tokenAddress, tokenId, startTime, endTime);
    await deployed.waitForDeployment();
    return deployed;
  }

  async function deployPublicDecryptSingleValue() {
    const factory = await hre.ethers.getContractFactory("PublicDecryptSingleValue");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [owner, alice, bob] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    paymentToken = await deployPaymentToken();
    paymentTokenAddress = await paymentToken.getAddress();

    prizeItem = await deployPrizeItem();
    prizeItemAddress = await prizeItem.getAddress();

    const mintTx = await prizeItem.connect(owner).newItem();
    await mintTx.wait();

    const now = await time.latest();
    auction = await deployAuction(prizeItemAddress, paymentTokenAddress, 0, now, now + 3600);
    auctionAddress = await auction.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(auction, "BlindAuction");

    await prizeItem.connect(owner).approve(auctionAddress, 0);
    await auction.connect(owner).depositPrize();

    await paymentToken.connect(owner).mint(alice.address, 1_000_000);
    await paymentToken.connect(owner).mint(bob.address, 1_000_000);
  });

  async function approveOperator(signer: HardhatEthersSigner) {
    const expiry = (await time.latest()) + 3600;
    const tx = await paymentToken.connect(signer).setOperator(auctionAddress, expiry);
    await tx.wait();
  }

  async function placeBid(signer: HardhatEthersSigner, amount: number) {
    const encrypted = hre.fhevm.createEncryptedInput(auctionAddress, signer.address);
    encrypted.add64(amount);
    const input = await encrypted.encrypt();
    await auction.connect(signer).bid(input.handles[0], input.inputProof);
  }

  async function decryptBalance(signer: HardhatEthersSigner) {
    const encryptedBalance = await paymentToken.confidentialBalanceOf(signer.address);
    return hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      paymentTokenAddress,
      signer,
    );
  }

  it("accepts encrypted bids and selects a winner", async () => {
    await approveOperator(alice);
    await approveOperator(bob);

    await placeBid(alice, 10_000);
    await placeBid(bob, 15_000);

    await time.increase(3600);

    await auction.requestDecryptWinningAddress();
    const winningAddressHandle = await auction.getWinningAddressHandle();
    const winningBidHandle = await auction.getWinningBidHandle();
    const decrypted = await hre.fhevm.publicDecrypt([winningAddressHandle, winningBidHandle]);
    await auction.resolveAuction(
      [winningAddressHandle, winningBidHandle],
      decrypted.abiEncodedClearValues,
      decrypted.decryptionProof,
    );

    expect(await auction.getWinnerAddress()).to.equal(bob.address);

    await auction.connect(bob).winnerClaimPrize();
    expect(await prizeItem.ownerOf(0)).to.equal(bob.address);

    const aliceBefore = await decryptBalance(alice);
    await auction.withdraw(alice.address);
    const aliceAfter = await decryptBalance(alice);
    expect(aliceAfter).to.equal(aliceBefore + 10_000n);

    const ownerBalance = await decryptBalance(owner);
    expect(ownerBalance).to.equal(15_000n);
  });

  it("does not reveal a winner when only zero-value bids are placed", async () => {
    await approveOperator(alice);

    await placeBid(alice, 0);
    await time.increase(3600);

    await auction.requestDecryptWinningAddress();
    const winningAddressHandle = await auction.getWinningAddressHandle();
    const winningBidHandle = await auction.getWinningBidHandle();
    const decrypted = await hre.fhevm.publicDecrypt([winningAddressHandle, winningBidHandle]);

    await expect(
      auction.resolveAuction(
        [winningAddressHandle, winningBidHandle],
        decrypted.abiEncodedClearValues,
        decrypted.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(auction, "NoWinnerToReveal");
  });

  it("rejects decryption proofs that do not match the winning handle", async () => {
    await approveOperator(alice);

    await placeBid(alice, 10_000);
    await time.increase(3600);

    await auction.requestDecryptWinningAddress();
    const winningBidHandle = await auction.getWinningBidHandle();

    const publicDecryptSingleValue = await deployPublicDecryptSingleValue();
    const publicDecryptSingleValueAddress = await publicDecryptSingleValue.getAddress();

    const encrypted = hre.fhevm.createEncryptedInput(
      publicDecryptSingleValueAddress,
      alice.address,
    );
    encrypted.add64(42);
    const input = await encrypted.encrypt();
    await publicDecryptSingleValue.connect(alice).storeValue(input.handles[0], input.inputProof);
    await publicDecryptSingleValue.publishValue();

    const fakeHandle = await publicDecryptSingleValue.getValueHandle();
    const decrypted = await hre.fhevm.publicDecrypt([fakeHandle, winningBidHandle]);

    await expect(
      auction.resolveAuction(
        [fakeHandle, winningBidHandle],
        decrypted.abiEncodedClearValues,
        decrypted.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(auction, "InvalidWinningHandle");
  });
});
