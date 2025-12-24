# ComplianceRules

> **Category**: identity
 | **Difficulty**: intermediate
 | **Chapters**: compliance
 | **Concept**: Combining encrypted compliance checks with FHE.and()

## Overview

Combines multiple compliance checks using FHE operations

### Developer Notes

Example for fhEVM Examples - Identity Category

### identityRegistry

```solidity
contract IIdentityRegistry identityRegistry
```

Reference to the identity registry

### owner

```solidity
address owner
```

Owner/admin

### pendingOwner

```solidity
address pendingOwner
```

Pending owner for two-step ownership transfer

### minKycLevel

```solidity
uint8 minKycLevel
```

Minimum KYC level required for compliance

### authorizedCallers

```solidity
mapping(address => bool) authorizedCallers
```

Authorized callers that can request compliance checks for others

### MinKycLevelUpdated

```solidity
event MinKycLevelUpdated(uint8 newLevel)
```

Emitted when the minimum KYC level requirement is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLevel | uint8 | The new minimum KYC level required for compliance |

### ComplianceChecked

```solidity
event ComplianceChecked(address user)
```

Emitted when a compliance check is performed for a user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user whose compliance was checked |

### AuthorizedCallerUpdated

```solidity
event AuthorizedCallerUpdated(address caller, bool allowed)
```

Emitted when a caller's authorization is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | Address being authorized or revoked |
| allowed | bool | Whether the caller is allowed |

### OwnershipTransferStarted

```solidity
event OwnershipTransferStarted(address currentOwner, address pendingOwner)
```

Emitted when ownership transfer is initiated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentOwner | address | Current owner address |
| pendingOwner | address | Address that can accept ownership |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address previousOwner, address newOwner)
```

Emitted when ownership transfer is completed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| previousOwner | address | Previous owner address |
| newOwner | address | New owner address |

### OnlyOwner

```solidity
error OnlyOwner()
```

Thrown when caller is not the contract owner

### OnlyPendingOwner

```solidity
error OnlyPendingOwner()
```

Thrown when caller is not the pending owner

### InvalidOwner

```solidity
error InvalidOwner()
```

Thrown when new owner is the zero address

### RegistryNotSet

```solidity
error RegistryNotSet()
```

Thrown when registry address is zero

### CallerNotAuthorized

```solidity
error CallerNotAuthorized()
```

Thrown when caller is not authorized to check another user

### AccessProhibited

```solidity
error AccessProhibited()
```

Thrown when caller lacks permission for encrypted result

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlyAuthorizedOrSelf

```solidity
modifier onlyAuthorizedOrSelf(address user)
```

### constructor

```solidity
constructor(address registry, uint8 initialMinKycLevel) public
```

Initialize with identity registry reference

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registry | address | Address of the IdentityRegistry contract |
| initialMinKycLevel | uint8 | Initial minimum KYC level (default: 1) |

### setMinKycLevel

```solidity
function setMinKycLevel(uint8 newLevel) external
```

Update minimum KYC level

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLevel | uint8 | New minimum level |

### setAuthorizedCaller

```solidity
function setAuthorizedCaller(address caller, bool allowed) external
```

Allow or revoke a caller to check compliance for other users

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | Address to update |
| allowed | bool | Whether the caller is allowed |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external
```

Initiate transfer of contract ownership

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOwner | address | Address that can accept ownership |

### acceptOwnership

```solidity
function acceptOwnership() external
```

Accept ownership transfer

### checkCompliance

```solidity
function checkCompliance(address user) external returns (ebool)
```

Check if user passes all compliance requirements

_Combines: hasMinKycLevel AND isNotBlacklisted_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating compliance status Note: This function makes external calls to IdentityRegistry which computes and stores verification results. The combined result is stored locally for later retrieval. |

### checkComplianceWithCountry

```solidity
function checkComplianceWithCountry(address user, uint16 allowedCountry) external returns (ebool)
```

Check compliance with additional country restriction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |
| allowedCountry | uint16 | Country code that is allowed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating compliance status |

### getComplianceResult

```solidity
function getComplianceResult(address user) external view returns (ebool)
```

Get the last compliance check result for a user

_Call checkCompliance first to compute and store the result_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to get result for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### hasComplianceResult

```solidity
function hasComplianceResult(address user) external view returns (bool)
```

Check if compliance result exists for user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether a cached result exists |

