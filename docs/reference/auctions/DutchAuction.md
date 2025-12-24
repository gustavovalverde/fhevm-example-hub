# DutchAuction

> **Category**: auctions
 | **Difficulty**: intermediate
 | **Chapters**: auctions
 | **Concept**: Dutch auction with descending price and encrypted reserve

## Overview

Dutch auction with descending price and encrypted reserve.

### Developer Notes

Example for fhEVM Examples - Auctions Category

In a Dutch auction, the price starts high and decreases over time.
The first bidder to accept the current price wins. The reserve price
is encrypted so bidders cannot know the seller's minimum.

### seller

```solidity
address seller
```

The seller receiving payment

### paymentToken

```solidity
contract ERC7984 paymentToken
```

Confidential payment token

### nftContract

```solidity
contract IERC721 nftContract
```

NFT contract for the prize

### tokenId

```solidity
uint256 tokenId
```

Token ID of the prize

### prizeDeposited

```solidity
bool prizeDeposited
```

Whether the prize has been deposited

### auctionStartTime

```solidity
uint256 auctionStartTime
```

Auction timing

### auctionEndTime

```solidity
uint256 auctionEndTime
```

Auction end timestamp

### startingPrice

```solidity
uint256 startingPrice
```

Price parameters (cleartext for price calculation)

### priceDecrement

```solidity
uint256 priceDecrement
```

Price decrement per interval

### decrementInterval

```solidity
uint256 decrementInterval
```

Seconds between price decrements

### winner

```solidity
address winner
```

Winner address (set when auction completes)

### finalPrice

```solidity
uint256 finalPrice
```

Final sale price

### TooEarlyError

```solidity
error TooEarlyError(uint256 time)
```

### TooLateError

```solidity
error TooLateError(uint256 time)
```

### InvalidAuctionTime

```solidity
error InvalidAuctionTime(uint256 startTime, uint256 endTime)
```

### PrizeNotDeposited

```solidity
error PrizeNotDeposited()
```

### PrizeAlreadyDeposited

```solidity
error PrizeAlreadyDeposited()
```

### OnlySeller

```solidity
error OnlySeller()
```

### AuctionAlreadyEnded

```solidity
error AuctionAlreadyEnded()
```

### BidTooLow

```solidity
error BidTooLow()
```

### ReservePriceNotSet

```solidity
error ReservePriceNotSet()
```

### onlyDuringAuction

```solidity
modifier onlyDuringAuction()
```

### getCurrentPrice

```solidity
function getCurrentPrice() public view returns (uint256)
```

Calculate the current price based on elapsed time.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The current asking price |

### constructor

```solidity
constructor(address nftContractAddress, address paymentTokenAddress, uint256 prizeTokenId, uint256 startTime, uint256 endTime, uint256 startPrice, uint256 decrement, uint256 interval) public
```

Create a Dutch auction.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftContractAddress | address | ERC721 prize contract |
| paymentTokenAddress | address | ERC7984 payment token |
| prizeTokenId | uint256 | Token ID of the prize |
| startTime | uint256 | Auction start timestamp |
| endTime | uint256 | Auction end timestamp |
| startPrice | uint256 | Starting price (highest) |
| decrement | uint256 | Price decrease per interval |
| interval | uint256 | Seconds between price decreases |

### depositPrize

```solidity
function depositPrize() external
```

Deposit the NFT prize into the auction.

### setReservePrice

```solidity
function setReservePrice(externalEuint64 encReserve, bytes inputProof) external
```

Set the encrypted reserve price (seller only).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encReserve | externalEuint64 | Encrypted reserve price handle |
| inputProof | bytes | Proof for the encrypted input |

### buy

```solidity
function buy() external
```

Accept the current price and buy the item.

_Uses FHE.select to handle reserve price check without revealing it.
     The bid succeeds only if current price >= reserve price._

### withdrawUnsoldItem

```solidity
function withdrawUnsoldItem() external
```

Withdraw the NFT if auction ends with no buyer.

