# AntiPatternMissingAllowThis

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: anti-patterns
 | **Concept**: Missing FHE.allowThis breaks reuse of stored handles

## Overview

Demonstrates the pitfall of omitting FHE.allowThis on stored values.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValue

```solidity
function storeValue(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted value without granting the contract permission.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### addToStored

```solidity
function addToStored(externalEuint64 encValue, bytes inputProof) external
```

Try to reuse the stored value (expected to fail in practice).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getStoredValue

```solidity
function getStoredValue(address user) external view returns (euint64)
```

Retrieve the stored value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The stored encrypted value |

