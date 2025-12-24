# ERC7984Example

> **Category**: identity
 | **Difficulty**: beginner
 | **Chapters**: erc7984
 | **Concept**: Minimal ERC7984 token with confidential mint + transfer

## Overview

Minimal ERC7984 confidential token example.

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### constructor

```solidity
constructor(address initialOwner) public
```

Initialize the minimal ERC7984 token

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

