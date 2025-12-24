# PrizeItem

## Overview

Simple ERC721 prize item for auction examples.

### constructor

```solidity
constructor() public
```

Create the auction prize item collection.

### newItem

```solidity
function newItem() external returns (uint256 tokenId)
```

Mint a new prize item for the caller.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The minted token ID |

