# FHEEq

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: comparisons
 | **Concept**: Compare two encrypted values using FHE.eq

## Overview

Encrypted equality comparison with FHE.eq.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (ebool)
```

Returns the last encrypted comparison result.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | The last encrypted comparison result |

### compare

```solidity
function compare(externalEuint64 encA, externalEuint64 encB, bytes inputProof) external
```

Compare two encrypted inputs and store the encrypted result.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encA | externalEuint64 | First encrypted value handle |
| encB | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

