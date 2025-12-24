# MintableConfidentialToken

> **Category**: identity
 | **Difficulty**: beginner

Key patterns:
- Owner-controlled minting of confidential balances
- Accepts encrypted amounts with FHE proofs
- Configurable name, symbol, and metadata URI | **Concept**: Mintable ERC7984 for testing confidential token workflows

## Overview

A mintable ERC7984 token for testing identity examples

### Developer Notes

Shared helper contract providing a simple mintable confidential token.
     Used by SwapERC7984ToERC20, SwapERC7984ToERC7984, and VestingWalletConfidentialExample.

### constructor

```solidity
constructor(address initialOwner, string name_, string symbol_, string tokenURI_) public
```

Creates a new mintable confidential token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own and mint tokens |
| name_ | string | The token name |
| symbol_ | string | The token symbol |
| tokenURI_ | string | The metadata URI for the token |

### mint

```solidity
function mint(address to, externalEuint64 amount, bytes inputProof) external
```

Mints confidential tokens to an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient address |
| amount | externalEuint64 | The encrypted amount to mint |
| inputProof | bytes | The FHE proof for the encrypted input |

