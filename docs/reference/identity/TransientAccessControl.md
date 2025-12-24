# TransientAccessRegistry

> **Category**: identity
 | **Difficulty**: intermediate | **Concept**: FHE.allowTransient() for one-transaction permissions between contracts

## Overview

Registry that stores encrypted scores and grants transient permissions

### Developer Notes

Demonstrates how to grant transient permissions to calling contracts

### ScoreStored

```solidity
event ScoreStored(address user)
```

Emitted when a user stores their encrypted score

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address that stored a score |

### NoScore

```solidity
error NoScore()
```

Error thrown when a user has no stored score

### storeScore

```solidity
function storeScore(externalEuint8 encryptedScore, bytes inputProof) external
```

Store an encrypted score for msg.sender

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedScore | externalEuint8 | Encrypted score (0-255) |
| inputProof | bytes | Proof for the encrypted input |

### getScoreFor

```solidity
function getScoreFor(address user) external returns (euint8)
```

Return a user's encrypted score AND grant the caller transient permission

_This must NOT be `view`, because it mutates transient ACL state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The score owner |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | The user's encrypted score |

### getScoreNoTransient

```solidity
function getScoreNoTransient(address user) external view returns (euint8)
```

Return a user's encrypted score WITHOUT granting transient permission (pitfall)

_Consumers that try to compute on the returned handle will revert._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The score owner |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | The user's encrypted score (without transient permission) |

# TransientScoreConsumer

## Overview

Consumer contract that demonstrates using transient permissions to access encrypted data

### Developer Notes

Shows both correct usage and common pitfalls when working with transient permissions

### NoCachedScore

```solidity
error NoCachedScore()
```

Error thrown when attempting to use a cached score that doesn't exist

### NoResult

```solidity
error NoResult()
```

Error thrown when attempting to retrieve a result that doesn't exist

### checkAtLeastWithTransient

```solidity
function checkAtLeastWithTransient(address registry, address user, uint8 minScore) external returns (ebool)
```

Compare a user's score against a plaintext threshold (works with `allowTransient`)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registry | address | Registry contract address |
| user | address | Score owner |
| minScore | uint8 | Minimum required score (plaintext) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### checkAtLeastWithoutTransient

```solidity
function checkAtLeastWithoutTransient(address registry, address user, uint8 minScore) external returns (ebool)
```

Same comparison but using a registry call that does NOT grant transient permission (pitfall)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registry | address | Registry contract address |
| user | address | Score owner |
| minScore | uint8 | Minimum required score (plaintext) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result (will fail without transient permission) |

### cacheScoreWithTransient

```solidity
function cacheScoreWithTransient(address registry, address user) external
```

Cache a user's score handle (works because reading doesn't require permission)

_The cached handle will NOT be usable in later txs unless permanently allowed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registry | address | Registry contract address |
| user | address | Score owner |

### useCachedScore

```solidity
function useCachedScore(uint8 minScore) external returns (ebool)
```

Attempt to reuse a cached handle in a later transaction (pitfall)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minScore | uint8 | Minimum required score (plaintext) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result (will revert without permanent permission) |

### getLastResult

```solidity
function getLastResult(address caller) external view returns (ebool)
```

Get the last computed result for a caller

_Call `checkAtLeastWithTransient` first._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | The address to get the result for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | The last computed encrypted boolean result |

