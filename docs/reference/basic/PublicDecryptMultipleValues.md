# PublicDecryptMultipleValues

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: decryption-public, relayer
 | **Concept**: Public decryption flow for multiple encrypted values

## Overview

Publish multiple encrypted results for public decryption.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValues

```solidity
function storeValues(externalEuint64 encFirst, externalEuint64 encSecond, bytes inputProof) external
```

Store two encrypted values.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encFirst | externalEuint64 | First encrypted value handle |
| encSecond | externalEuint64 | Second encrypted value handle |
| inputProof | bytes | Proof for the encrypted inputs |

### publishValues

```solidity
function publishValues() external
```

Publish both values for public decryption.

### getValueHandles

```solidity
function getValueHandles() external view returns (bytes32, bytes32)
```

Returns the handles for public decryption.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Handle for the first encrypted value |
| [1] | bytes32 | Handle for the second encrypted value |

