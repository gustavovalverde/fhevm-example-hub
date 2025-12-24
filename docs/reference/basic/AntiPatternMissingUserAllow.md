# AntiPatternMissingUserAllow

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: anti-patterns
 | **Concept**: Missing FHE.allow(user) blocks user decryption

## Overview

Forgetting to grant user access prevents decryption.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeValue

```solidity
function storeValue(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted value but forget to grant user access (pitfall).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getStoredValue

```solidity
function getStoredValue(address user) external view returns (euint64)
```

Return the stored encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted stored value |

