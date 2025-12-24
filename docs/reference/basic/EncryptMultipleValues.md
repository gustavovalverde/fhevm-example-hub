# EncryptMultipleValues

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: encryption
 | **Concept**: Store multiple encrypted values with a single proof

## Overview

Store multiple encrypted values in one transaction.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValues

```solidity
function storeValues(externalEuint64 encFirst, externalEuint64 encSecond, bytes inputProof) external
```

Store two encrypted values for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encFirst | externalEuint64 | First encrypted value handle |
| encSecond | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

### getValues

```solidity
function getValues(address user) external view returns (euint64, euint64)
```

Retrieve both encrypted values for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted values |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | First encrypted value |
| [1] | euint64 | Second encrypted value |

