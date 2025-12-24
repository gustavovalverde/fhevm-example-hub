# MockERC20

## Overview

A simple mock ERC20 token for testing

### Developer Notes

Provides public mint function for test scenarios.
     Used by SwapERC7984ToERC20 tests.

### constructor

```solidity
constructor(address to, uint256 initialMint) public
```

Creates a new mock ERC20 token with initial mint

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to receive the initial mint |
| initialMint | uint256 | The amount to mint initially |

### mint

```solidity
function mint(address to, uint256 amount) external
```

Mints tokens to an address (unrestricted for testing)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient address |
| amount | uint256 | The amount to mint |

