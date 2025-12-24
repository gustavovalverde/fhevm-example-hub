# AccessControlGrants

> **Category**: identity
 | **Difficulty**: intermediate

This contract shows how users can granularly control access to their
encrypted data. Users can grant and revoke access to specific parties
for specific data fields.

Key patterns demonstrated:
1. FHE.allow() for granting read access
2. Tiered access control (view encrypted, decrypt, modify)
3. Time-limited access grants
4. Multi-party access coordination | **Chapters**: access-control
 | **Concept**: User-controlled FHE.allow() permissions

## Overview

Demonstrates user-controlled FHE.allow() permission patterns

### Developer Notes

Example for fhEVM Examples - Identity Category

### hasAccess

```solidity
mapping(address => mapping(address => bool)) hasAccess
```

Track which addresses have been granted access

### accessExpiry

```solidity
mapping(address => mapping(address => uint256)) accessExpiry
```

Track time-limited access grants

### CredentialStored

```solidity
event CredentialStored(address user)
```

Emitted when a user stores their credential score

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user who stored their credential |

### AccessGranted

```solidity
event AccessGranted(address owner, address grantee)
```

Emitted when access is granted to another address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The data owner granting access |
| grantee | address | The address receiving access |

### AccessRevoked

```solidity
event AccessRevoked(address owner, address grantee)
```

Emitted when access is revoked from an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The data owner revoking access |
| grantee | address | The address losing access |

### TimedAccessGranted

```solidity
event TimedAccessGranted(address owner, address grantee, uint256 expiry)
```

Emitted when time-limited access is granted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The data owner granting access |
| grantee | address | The address receiving access |
| expiry | uint256 | The timestamp when access expires |

### NoCredential

```solidity
error NoCredential()
```

### AlreadyGranted

```solidity
error AlreadyGranted()
```

### NotGranted

```solidity
error NotGranted()
```

### AccessExpired

```solidity
error AccessExpired()
```

### storeCredential

```solidity
function storeCredential(externalEuint8 encryptedScore, bytes inputProof) external
```

Store an encrypted credential score

_Demonstrates: Basic encrypted storage with self-access_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedScore | externalEuint8 | Encrypted credential score (0-255) |
| inputProof | bytes | Proof for the encrypted input |

### grantAccess

```solidity
function grantAccess(address grantee) external
```

Grant permanent access to another address

_Demonstrates: FHE.allow() for access delegation_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| grantee | address | Address to grant access to After calling this, grantee can decrypt the credential score |

### grantTimedAccess

```solidity
function grantTimedAccess(address grantee, uint256 duration) external
```

Grant time-limited access

_Demonstrates: Combining FHE access with expiry checks_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| grantee | address | Address to grant access to |
| duration | uint256 | Duration in seconds Note: FHE.allow() is permanent, but we track expiry off-chain and check it before returning data |

### revokeAccess

```solidity
function revokeAccess(address grantee) external
```

Revoke access from a grantee

_Note: FHE access cannot be revoked on-chain, but we can
prevent contract-level access and update a new encrypted value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| grantee | address | Address to revoke access from |

### getCredential

```solidity
function getCredential(address owner) external view returns (euint8)
```

Get credential score (with access check)

_Demonstrates: Access-controlled encrypted data retrieval_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address whose credential to retrieve |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | Encrypted credential score |

### compareCredentials

```solidity
function compareCredentials(address user1, address user2) external returns (ebool)
```

Compare two users' credentials (both must grant access)

_Demonstrates: Multi-party access for encrypted comparison_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user1 | address | First user |
| user2 | address | Second user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean (true if user1 >= user2) Both users must have granted access to msg.sender for this to work |

### getComparisonResult

```solidity
function getComparisonResult(address user1, address user2) external view returns (ebool)
```

Get the last comparison result between two users

_Call compareCredentials first to compute and store the result_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user1 | address | First user |
| user2 | address | Second user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### hasValidAccess

```solidity
function hasValidAccess(address owner, address grantee) external view returns (bool)
```

Check if a grantee has valid access

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address of data owner |
| grantee | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether grantee has valid (non-expired) access |

### getGrantees

```solidity
function getGrantees(address owner) external view returns (address[])
```

Get all grantees for a user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address of data owner |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | Array of grantee addresses |

### hasCredential

```solidity
function hasCredential(address user) external view returns (bool)
```

Check if user has a credential stored

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether user has stored credential |

### findGranteeIndex

```solidity
function findGranteeIndex(address owner, address grantee) internal view returns (uint256 index)
```

Find the index of a grantee in the grantee list

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The data owner |
| grantee | address | The grantee to find |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the grantee, or type(uint256).max if not found |

