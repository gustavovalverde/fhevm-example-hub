# FHESub

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: arithmetic
 | **Concept**: Subtract two encrypted values with FHE.sub

## Overview

Encrypted subtraction example for two values.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (euint64)
```

Returns the last encrypted difference.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted difference |

### subValues

```solidity
function subValues(externalEuint64 encA, externalEuint64 encB, bytes inputProof) external
```

Subtract two encrypted inputs (a - b) and store the encrypted result.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encA | externalEuint64 | First encrypted value handle (minuend) |
| encB | externalEuint64 | Second encrypted value handle (subtrahend) |
| inputProof | bytes | Proof for the encrypted inputs |

