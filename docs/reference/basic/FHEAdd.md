# FHEAdd

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: arithmetic
 | **Concept**: Add two encrypted values with FHE.add

## Overview

Encrypted addition example for two values.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (euint64)
```

Returns the last encrypted sum.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted sum |

### addValues

```solidity
function addValues(externalEuint64 encA, externalEuint64 encB, bytes inputProof) external
```

Add two encrypted inputs and store the encrypted result.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encA | externalEuint64 | First encrypted value handle |
| encB | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

