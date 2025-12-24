# ERC7984ObserverAccessExample

> **Category**: identity
 | **Difficulty**: intermediate
 | **Chapters**: erc7984
 | **Concept**: ERC7984ObserverAccess for opt-in audit / compliance observers

## Overview

Travel-Rule style observer access for confidential token balances and transfer amounts

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### constructor

```solidity
constructor(address initialOwner) public
```

Initializes the Observer Access ERC7984 token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |

### mint

```solidity
function mint(address to, externalEuint64 amount, bytes inputProof) external
```

Mint confidential tokens (owner-only)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient |
| amount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for the encrypted input |

