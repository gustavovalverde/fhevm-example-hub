/**
 * @title DutchAuction Tests
 * @notice Tests for Dutch auction with descending price
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("DutchAuction", () => {
  let auction: Awaited<ReturnType<typeof deployAuction>>;
  let paymentToken: Awaited<ReturnType<typeof deployPaymentToken>>;
  let prizeItem: Awaited<ReturnType<typeof deployPrizeItem>>;
  let auctionAddress: string;
  let paymentTokenAddress: string;
  let prizeItemAddress: string;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;

  const STARTING_PRICE = 1_000_000;
  const PRICE_DECREMENT = 100_000;
  const DECREMENT_INTERVAL = 60; // 60 seconds

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
    const factory = await hre.ethers.getContractFactory("DutchAuction");
    const deployed = await factory.deploy(
      nftAddress,
      tokenAddress,
      tokenId,
      startTime,
      endTime,
      STARTING_PRICE,
      PRICE_DECREMENT,
      DECREMENT_INTERVAL,
    );
    await deployed.waitForDeployment();
    return deployed;
  }

  before(async () => {
    [owner, buyer] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    paymentToken = await deployPaymentToken();
    paymentTokenAddress = await paymentToken.getAddress();

    prizeItem = await deployPrizeItem();
    prizeItemAddress = await prizeItem.getAddress();

    await prizeItem.connect(owner).newItem();

    const now = await time.latest();
    auction = await deployAuction(prizeItemAddress, paymentTokenAddress, 0, now, now + 3600);
    auctionAddress = await auction.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(auction, "DutchAuction");

    await prizeItem.connect(owner).approve(auctionAddress, 0);
    await auction.connect(owner).depositPrize();

    // Set encrypted reserve price (e.g., 500,000 - half of starting)
    const encrypted = hre.fhevm.createEncryptedInput(auctionAddress, owner.address);
    encrypted.add64(500_000);
    const input = await encrypted.encrypt();
    await auction.connect(owner).setReservePrice(input.handles[0], input.inputProof);

    await paymentToken.connect(owner).mint(buyer.address, 2_000_000);
  });

  async function approveOperator(signer: HardhatEthersSigner) {
    const expiry = (await time.latest()) + 3600;
    await paymentToken.connect(signer).setOperator(auctionAddress, expiry);
  }

  it("price decreases over time", async () => {
    const initialPrice = await auction.getCurrentPrice();
    expect(initialPrice).to.equal(STARTING_PRICE);

    await time.increase(60);
    const priceAfter1Min = await auction.getCurrentPrice();
    expect(priceAfter1Min).to.equal(STARTING_PRICE - PRICE_DECREMENT);

    await time.increase(60);
    const priceAfter2Min = await auction.getCurrentPrice();
    expect(priceAfter2Min).to.equal(STARTING_PRICE - 2 * PRICE_DECREMENT);
  });

  it("accepts purchase at current price above reserve", async () => {
    await approveOperator(buyer);

    // Wait for price to drop to 700,000 (above reserve of 500,000)
    await time.increase(180); // 3 intervals
    const currentPrice = await auction.getCurrentPrice();
    expect(currentPrice).to.equal(700_000);

    await auction.connect(buyer).buy();

    expect(await auction.winner()).to.equal(buyer.address);
    expect(await auction.finalPrice()).to.equal(700_000);
    expect(await prizeItem.ownerOf(0)).to.equal(buyer.address);
  });

  it("allows seller to withdraw unsold item after auction ends", async () => {
    await time.increase(3600);

    await auction.connect(owner).withdrawUnsoldItem();
    expect(await prizeItem.ownerOf(0)).to.equal(owner.address);
  });

  it("rejects purchase before auction starts", async () => {
    // Deploy a new auction starting in the future
    const futureStart = (await time.latest()) + 1000;
    const futureAuction = await deployAuction(
      prizeItemAddress,
      paymentTokenAddress,
      0,
      futureStart,
      futureStart + 3600,
    );

    await expect(futureAuction.connect(buyer).buy()).to.be.revertedWithCustomError(
      futureAuction,
      "TooEarlyError",
    );
  });

  it("rejects purchase after auction ends", async () => {
    await time.increase(3601);

    await expect(auction.connect(buyer).buy()).to.be.revertedWithCustomError(
      auction,
      "TooLateError",
    );
  });
});
