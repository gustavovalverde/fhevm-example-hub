# DutchAuction

> **Category**: Auctions | **Difficulty**: Intermediate | **Chapters**: Auctions | **Concept**: Dutch auction with descending price and encrypted reserve

Dutch auction with descending price and encrypted reserve.

## Why this example

This example focuses on **Dutch auction with descending price and encrypted reserve**. It is designed to be self-contained and easy to run locally.

## Quick start

```bash
npm install
npm run test:mocked -- test/auctions/DutchAuction.test.ts
```

## Dependencies

- AuctionPaymentToken
- PrizeItem

## Deployment plan

| Step | Contract | Args | Saves As |
| --- | --- | --- | --- |
| 1 | PrizeItem | - | prizeItem |
| 2 | AuctionPaymentToken | $deployer, "Auction USD", "AUSD", "" | paymentToken |
| 3 | DutchAuction | @prizeItem, @paymentToken, 0, #Math.floor(Date.now()/1000), #Math.floor(Date.now()/1000)+3600, 1000000, 100000, 10000 | auction |


## Contract and test

{% tabs %}

{% tab title="DutchAuction.sol" %}


```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

// solhint-disable max-line-length
/**
 * @title DutchAuction
 * @author Gustavo Valverde
 * @notice Dutch auction with descending price and encrypted reserve.
 * @dev Example for fhEVM Examples - Auctions Category
 *
 * In a Dutch auction, the price starts high and decreases over time.
 * The first bidder to accept the current price wins. The reserve price
 * is encrypted so bidders cannot know the seller's minimum.
 *
 * @custom:category auctions
 * @custom:chapter auctions
 * @custom:concept Dutch auction with descending price and encrypted reserve
 * @custom:difficulty intermediate
 * @custom:depends-on AuctionPaymentToken,PrizeItem
 * @custom:deploy-plan [{"contract":"PrizeItem","saveAs":"prizeItem"},{"contract":"AuctionPaymentToken","saveAs":"paymentToken","args":["$deployer","Auction USD","AUSD",""]},{"contract":"DutchAuction","saveAs":"auction","args":["@prizeItem","@paymentToken",0,"#Math.floor(Date.now()/1000)","#Math.floor(Date.now()/1000)+3600",1000000,100000,10000],"afterDeploy":["await prizeItem.approve(await auction.getAddress(), 0);","await auction.depositPrize();"]}]
 */
contract DutchAuction is ZamaEthereumConfig, ReentrancyGuard {
    // solhint-enable max-line-length

    /// @notice The seller receiving payment
    address public seller;

    /// @notice Confidential payment token
    ERC7984 public paymentToken;

    /// @notice NFT contract for the prize
    IERC721 public nftContract;
    /// @notice Token ID of the prize
    uint256 public tokenId;
    /// @notice Whether the prize has been deposited
    bool public prizeDeposited;

    /// @notice Auction timing
    uint256 public auctionStartTime;
    /// @notice Auction end timestamp
    uint256 public auctionEndTime;

    /// @notice Price parameters (cleartext for price calculation)
    uint256 public startingPrice;
    /// @notice Price decrement per interval
    uint256 public priceDecrement;
    /// @notice Seconds between price decrements
    uint256 public decrementInterval;

    /// @notice Encrypted reserve price (seller's minimum)
    euint64 private reservePrice;

    /// @notice Winner address (set when auction completes)
    address public winner;

    /// @notice Final sale price
    uint256 public finalPrice;

    // ========== Errors ==========

    error TooEarlyError(uint256 time);
    error TooLateError(uint256 time);
    error InvalidAuctionTime(uint256 startTime, uint256 endTime);
    error PrizeNotDeposited();
    error PrizeAlreadyDeposited();
    error OnlySeller();
    error AuctionAlreadyEnded();
    error BidTooLow();
    error ReservePriceNotSet();

    // ========== Modifiers ==========

    modifier onlyDuringAuction() {
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auctionStartTime) revert TooEarlyError(auctionStartTime);
        // solhint-disable-next-line not-rely-on-time,gas-strict-inequalities
        if (block.timestamp >= auctionEndTime) revert TooLateError(auctionEndTime);
        if (winner != address(0)) revert AuctionAlreadyEnded();
        _;
    }

    // ========== Views ==========

    /// @notice Calculate the current price based on elapsed time.
    /// @return The current asking price
    function getCurrentPrice() public view returns (uint256) {
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auctionStartTime) return startingPrice;
        // solhint-disable-next-line not-rely-on-time
        uint256 elapsed = block.timestamp - auctionStartTime;
        uint256 decrements = elapsed / decrementInterval;
        uint256 totalDecrement = decrements * priceDecrement;

        // solhint-disable-next-line gas-strict-inequalities
        if (totalDecrement >= startingPrice) {
            return 0;
        }
        return startingPrice - totalDecrement;
    }

    /**
     * @notice Create a Dutch auction.
     * @param nftContractAddress ERC721 prize contract
     * @param paymentTokenAddress ERC7984 payment token
     * @param prizeTokenId Token ID of the prize
     * @param startTime Auction start timestamp
     * @param endTime Auction end timestamp
     * @param startPrice Starting price (highest)
     * @param decrement Price decrease per interval
     * @param interval Seconds between price decreases
     */
    constructor(
        address nftContractAddress,
        address paymentTokenAddress,
        uint256 prizeTokenId,
        uint256 startTime,
        uint256 endTime,
        uint256 startPrice,
        uint256 decrement,
        uint256 interval
    ) {
        // solhint-disable-next-line gas-strict-inequalities
        if (startTime >= endTime) revert InvalidAuctionTime(startTime, endTime);
        seller = msg.sender;
        paymentToken = ERC7984(paymentTokenAddress);
        nftContract = IERC721(nftContractAddress);
        tokenId = prizeTokenId;
        auctionStartTime = startTime;
        auctionEndTime = endTime;
        startingPrice = startPrice;
        priceDecrement = decrement;
        decrementInterval = interval;
    }

    /// @notice Deposit the NFT prize into the auction.
    function depositPrize() external {
        if (msg.sender != seller) revert OnlySeller();
        if (prizeDeposited) revert PrizeAlreadyDeposited();
        prizeDeposited = true;
        nftContract.transferFrom(msg.sender, address(this), tokenId);
    }

    /// @notice Set the encrypted reserve price (seller only).
    /// @param encReserve Encrypted reserve price handle
    /// @param inputProof Proof for the encrypted input
    function setReservePrice(externalEuint64 encReserve, bytes calldata inputProof) external {
        if (msg.sender != seller) revert OnlySeller();
        reservePrice = FHE.fromExternal(encReserve, inputProof);
        FHE.allowThis(reservePrice);
    }

    /**
     * @notice Accept the current price and buy the item.
     * @dev Uses FHE.select to handle reserve price check without revealing it.
     *      The bid succeeds only if current price >= reserve price.
     */
    function buy() external onlyDuringAuction nonReentrant {
        if (!prizeDeposited) revert PrizeNotDeposited();
        if (!FHE.isInitialized(reservePrice)) revert ReservePriceNotSet();

        uint256 currentPrice = getCurrentPrice();

        // Check if current price meets the reserve (encrypted comparison)
        euint64 encCurrentPrice = FHE.asEuint64(uint64(currentPrice));
        ebool meetsReserve = FHE.ge(encCurrentPrice, reservePrice);

        // Branch-free: if reserve not met, the price would be 0
        euint64 actualPrice = FHE.select(meetsReserve, encCurrentPrice, FHE.asEuint64(0));

        // Transfer payment from buyer to this contract
        FHE.allowTransient(actualPrice, address(paymentToken));
        paymentToken.confidentialTransferFrom(msg.sender, address(this), actualPrice);

        // If reserve wasn't met, the transfer would be 0 and this check fails
        // We use a revert here since this is observable behavior anyway
        // (the NFT transfer wouldn't happen)
        if (!FHE.isInitialized(actualPrice)) revert BidTooLow();

        // Forward payment to seller
        FHE.allowTransient(actualPrice, address(paymentToken));
        paymentToken.confidentialTransfer(seller, actualPrice);

        // Transfer NFT to winner
        winner = msg.sender;
        finalPrice = currentPrice;
        nftContract.transferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Withdraw the NFT if auction ends with no buyer.
    function withdrawUnsoldItem() external {
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auctionEndTime) revert TooEarlyError(auctionEndTime);
        if (winner != address(0)) revert AuctionAlreadyEnded();
        if (msg.sender != seller) revert OnlySeller();
        if (!prizeDeposited) revert PrizeNotDeposited();

        nftContract.transferFrom(address(this), seller, tokenId);
    }
}
```

{% endtab %}

{% tab title="DutchAuction.test.ts" %}


```typescript
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
```

{% endtab %}

{% endtabs %}

## Pitfalls to avoid

No pitfalls are highlighted in the tests for this example.
