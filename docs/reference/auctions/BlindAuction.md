# BlindAuction

> **Category**: auctions
 | **Difficulty**: advanced
 | **Chapters**: auctions
 | **Concept**: Sealed-bid auction with encrypted bids and public reveal

## Overview

Sealed-bid auction using encrypted bids and confidential payments.

### Developer Notes

Example for fhEVM Examples - Auctions Category

### beneficiary

```solidity
address beneficiary
```

The recipient of the highest bid once the auction ends

### paymentToken

```solidity
contract ERC7984 paymentToken
```

Confidential payment token

### nftContract

```solidity
contract IERC721 nftContract
```

Token for the auction prize

### tokenId

```solidity
uint256 tokenId
```

Token ID of the prize NFT

### prizeDeposited

```solidity
bool prizeDeposited
```

Whether the prize NFT was deposited

### auctionStartTime

```solidity
uint256 auctionStartTime
```

Auction start time (unix timestamp)

### auctionEndTime

```solidity
uint256 auctionEndTime
```

Auction end time (unix timestamp)

### winnerAddress

```solidity
address winnerAddress
```

Winner address defined at the end of the auction

### isNftClaimed

```solidity
bool isNftClaimed
```

Indicate if the NFT of the auction has been claimed

### TooEarlyError

```solidity
error TooEarlyError(uint256 time)
```

Error thrown when a function is called too early

### TooLateError

```solidity
error TooLateError(uint256 time)
```

Error thrown when a function is called too late

### InvalidAuctionTime

```solidity
error InvalidAuctionTime(uint256 startTime, uint256 endTime)
```

Thrown when the auction time range is invalid

### WinnerNotYetRevealed

```solidity
error WinnerNotYetRevealed()
```

Thrown when attempting an action that requires the winner to be resolved

### PrizeNotDeposited

```solidity
error PrizeNotDeposited()
```

Thrown when the prize was not deposited yet

### OnlyBeneficiary

```solidity
error OnlyBeneficiary()
```

Thrown when a non-beneficiary calls a restricted action

### PrizeAlreadyDeposited

```solidity
error PrizeAlreadyDeposited()
```

Thrown when the prize is already deposited

### OnlyWinner

```solidity
error OnlyWinner()
```

Thrown when a non-winner attempts a winner-only action

### NftAlreadyClaimed

```solidity
error NftAlreadyClaimed()
```

Thrown when the NFT prize was already claimed

### NoWinnerToReveal

```solidity
error NoWinnerToReveal()
```

Thrown when no valid winner exists to reveal

### WinnerAlreadyRevealed

```solidity
error WinnerAlreadyRevealed()
```

Thrown when the winning address has already been revealed

### InvalidWinningHandle

```solidity
error InvalidWinningHandle(bytes32 expected, bytes32 provided)
```

Thrown when the decryption proof does not match the winning handle

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| expected | bytes32 | The expected winning handle |
| provided | bytes32 | The provided handle |

### onlyDuringAuction

```solidity
modifier onlyDuringAuction()
```

### onlyAfterEnd

```solidity
modifier onlyAfterEnd()
```

### onlyAfterWinnerRevealed

```solidity
modifier onlyAfterWinnerRevealed()
```

### getEncryptedBid

```solidity
function getEncryptedBid(address account) external view returns (euint64)
```

Return the encrypted bid stored for a bidder.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Bidder address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted bid handle |

### getWinnerAddress

```solidity
function getWinnerAddress() external view returns (address)
```

Return the decrypted winner address once revealed.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The winner address |

### constructor

```solidity
constructor(address nftContractAddress, address paymentTokenAddress, uint256 prizeTokenId, uint256 startTime, uint256 endTime) public
```

Create the blind auction contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftContractAddress | address | ERC721 prize contract |
| paymentTokenAddress | address | ERC7984 payment token |
| prizeTokenId | uint256 | Token ID of the prize NFT |
| startTime | uint256 | Auction start timestamp |
| endTime | uint256 | Auction end timestamp |

### depositPrize

```solidity
function depositPrize() external
```

Deposit the NFT prize into the auction contract.

### bid

```solidity
function bid(externalEuint64 encryptedAmount, bytes inputProof) external
```

Place an encrypted bid during the auction window.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted bid amount handle |
| inputProof | bytes | Proof for the encrypted input |

### requestDecryptWinningAddress

```solidity
function requestDecryptWinningAddress() external
```

Publish the encrypted winner address and bid for public decryption.

### getWinningAddressHandle

```solidity
function getWinningAddressHandle() external view returns (bytes32)
```

Return the handle for the encrypted winning address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The encrypted winner address handle |

### getWinningBidHandle

```solidity
function getWinningBidHandle() external view returns (bytes32)
```

Return the handle for the encrypted winning bid.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The encrypted winning bid handle |

### winnerClaimPrize

```solidity
function winnerClaimPrize() external
```

Claim the NFT prize.

### withdraw

```solidity
function withdraw(address bidder) external
```

Withdraw a bid from the auction (non-winners only).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| bidder | address | Address of the bidder withdrawing |

### resolveAuction

```solidity
function resolveAuction(bytes32[] handlesList, bytes cleartexts, bytes decryptionProof) external
```

Resolve the auction by verifying the decryption proof for the winner.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| handlesList | bytes32[] | Handles signed by the gateway |
| cleartexts | bytes | Decrypted cleartexts |
| decryptionProof | bytes | Proof for the gateway signature |

