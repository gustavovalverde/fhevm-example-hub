# UserDecryptSingleValue

> **Category**: basic
 | **Difficulty**: beginner | **Chapters**: decryption-user
 | **Concept**: User decryption flow for a single encrypted result

## Overview

Compute on encrypted input and allow the user to decrypt the result.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastResult

```solidity
function getLastResult() external view returns (euint64)
```

Get the encrypted result.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted result |

### computePlusOne

```solidity
function computePlusOne(externalEuint64 encValue, bytes inputProof) external
```

Add 1 to the encrypted input and store the encrypted result.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

