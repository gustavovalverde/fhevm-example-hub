# PublicDecryptSingleValue

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: decryption-public, relayer
 | **Concept**: Public decryption flow for a single encrypted value

## Overview

Publish a single encrypted result for public decryption.

### Developer Notes

Example for fhEVM Examples - Basic Category

### getLastValue

```solidity
function getLastValue() external view returns (euint64)
```

Returns the last encrypted value.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The last encrypted value |

### storeValue

```solidity
function storeValue(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### publishValue

```solidity
function publishValue() external
```

Publish the encrypted value for public decryption.

### getValueHandle

```solidity
function getValueHandle() external view returns (bytes32)
```

Returns the handle for public decryption.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The encrypted handle as bytes32 |

