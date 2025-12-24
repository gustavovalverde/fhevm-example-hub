# AuctionPaymentToken

## Overview

Simple confidential token for auction payments.

### Developer Notes

Helper contract for the BlindAuction example.

### constructor

```solidity
constructor(address initialOwner, string name_, string symbol_, string tokenURI_) public
```

Create the auction payment token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | Owner address for admin actions |
| name_ | string | Token name |
| symbol_ | string | Token symbol |
| tokenURI_ | string | Token metadata URI |

### mint

```solidity
function mint(address to, uint64 amount) external
```

Mint confidential tokens with a plaintext amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| amount | uint64 | Plaintext amount to mint |

