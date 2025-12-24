# AntiPatternViewOnEncrypted

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: anti-patterns
 | **Concept**: View functions return encrypted handles, not plaintext

## Overview

Demonstrates why a view call still returns encrypted handles.

### Developer Notes

Example for fhEVM Examples - Basic Category

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

### getEncryptedValue

```solidity
function getEncryptedValue(address user) external view returns (euint64)
```

Read the encrypted value from a view function.

_The return value is still encrypted and must be decrypted off-chain._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted value handle |

