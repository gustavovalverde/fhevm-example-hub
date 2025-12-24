# MockUSDC

## Overview

A mock USDC token with 6 decimals for testing

### Developer Notes

Mimics USDC's 6-decimal precision.
     Used by ERC7984ERC20WrapperExample tests.

### constructor

```solidity
constructor(address to, uint256 initialMint) public
```

Creates a new mock USDC token with initial mint

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to receive the initial mint |
| initialMint | uint256 | The amount to mint initially (in 6-decimal units) |

### decimals

```solidity
function decimals() public pure returns (uint8)
```

Returns 6 decimals to match real USDC

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The number of decimals (6) |

### mint

```solidity
function mint(address to, uint256 amount) external
```

Mints tokens to an address (unrestricted for testing)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient address |
| amount | uint256 | The amount to mint (in 6-decimal units) |

