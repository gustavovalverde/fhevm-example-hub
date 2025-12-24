# FHEIfThenElse

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: arithmetic
 | **Concept**: Conditional selection on encrypted values using FHE.select

## Overview

Use FHE.select to implement an encrypted if/else branch.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (euint64)
```

Return the last encrypted result.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted selection result. |

### choose

```solidity
function choose(externalEuint64 left, externalEuint64 right, externalEuint64 threshold, bytes inputProof) external
```

Pick between left/right depending on whether left <= threshold.

_All three encrypted inputs must be bound to the same proof._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| left | externalEuint64 | Encrypted left value |
| right | externalEuint64 | Encrypted right value |
| threshold | externalEuint64 | Encrypted threshold value |
| inputProof | bytes | Proof for the encrypted inputs |

