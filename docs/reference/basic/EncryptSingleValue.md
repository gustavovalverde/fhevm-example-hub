# EncryptSingleValue

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: encryption
 | **Concept**: Store one encrypted value and grant permissions

## Overview

Store a single encrypted value for each user.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValue

```solidity
function storeValue(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted value for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getValue

```solidity
function getValue(address user) external view returns (euint64)
```

Retrieve the encrypted value for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted stored value |

