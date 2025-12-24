# HandleGeneration

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: handles
 | **Concept**: Handles are opaque references; FHE ops create derived handles (symbolic execution)

## Overview

Show how encrypted handles are created and derived without plaintext.

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

### deriveValue

```solidity
function deriveValue(uint64 addend) external
```

Create a derived handle by adding and doubling (symbolic execution).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addend | uint64 | Plaintext addend applied to the stored encrypted value |

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

### getDerivedValue

```solidity
function getDerivedValue(address user) external view returns (euint64)
```

Return the derived encrypted value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the derived value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted derived value |

### getStoredHandle

```solidity
function getStoredHandle(address user) external view returns (bytes32)
```

Return the raw handle bytes for the stored value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Raw handle bytes for the stored value |

### getDerivedHandle

```solidity
function getDerivedHandle(address user) external view returns (bytes32)
```

Return the raw handle bytes for the derived value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the derived value |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Raw handle bytes for the derived value |

