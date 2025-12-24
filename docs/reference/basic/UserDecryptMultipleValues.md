# UserDecryptMultipleValues

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: decryption-user
 | **Concept**: User decryption flow for multiple encrypted results

## Overview

Produce multiple encrypted outputs and allow the user to decrypt both.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastSum

```solidity
function getLastSum() external view returns (euint64)
```

Returns the last encrypted sum.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted sum |

### getLastDifference

```solidity
function getLastDifference() external view returns (euint64)
```

Returns the last encrypted difference.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted difference |

### computeSumAndDifference

```solidity
function computeSumAndDifference(externalEuint64 encA, externalEuint64 encB, bytes inputProof) external
```

Compute sum and difference for two encrypted inputs.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encA | externalEuint64 | First encrypted value handle |
| encB | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

