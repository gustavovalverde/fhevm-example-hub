# HandleLifecycle

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: handles
 | **Concept**: Store encrypted handles and reuse them across calls

## Overview

Show how encrypted handles can be stored and reused safely.

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

### addToStored

```solidity
function addToStored(externalEuint64 encValue, bytes inputProof) external
```

Add an encrypted value to the stored handle.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getStoredValue

```solidity
function getStoredValue(address user) external view returns (euint64)
```

Retrieve the stored encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The stored encrypted value |

