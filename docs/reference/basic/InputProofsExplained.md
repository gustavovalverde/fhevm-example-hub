# InputProofsExplained

> **Category**: basic
 | **Difficulty**: intermediate | **Chapters**: input-proofs
 | **Concept**: Input proofs bind encrypted inputs to a contract and sender

## Overview

Demonstrate input proof binding to contract and signer.

### Developer Notes

Example for fhEVM Examples - Basic Category

### storeSecret

```solidity
function storeSecret(externalEuint64 encValue, bytes inputProof) external
```

Store an encrypted secret for the sender.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encValue | externalEuint64 | Encrypted value handle |
| inputProof | bytes | Proof for the encrypted input |

### getSecret

```solidity
function getSecret(address user) external view returns (euint64)
```

Retrieve the encrypted secret for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Account holding the encrypted secret |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | The encrypted secret value |

