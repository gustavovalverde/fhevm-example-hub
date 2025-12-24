# FHECounter

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: basics
 | **Concept**: Encrypted counter using FHE.add and FHE.sub

## Overview

Encrypted counter with increment and decrement operations.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getCount

```solidity
function getCount() external view returns (euint64)
```

Returns the encrypted counter value.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted counter value |

### increment

```solidity
function increment(externalEuint64 encAmount, bytes inputProof) external
```

Increment the counter by an encrypted amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encAmount | externalEuint64 | Encrypted amount handle |
| inputProof | bytes | Proof for the encrypted input |

### decrement

```solidity
function decrement(externalEuint64 encAmount, bytes inputProof) external
```

Decrement the counter by an encrypted amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encAmount | externalEuint64 | Encrypted amount handle |
| inputProof | bytes | Proof for the encrypted input |

