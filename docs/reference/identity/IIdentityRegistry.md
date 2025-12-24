# IIdentityRegistry

> **Category**: identity
 | **Difficulty**: intermediate | **Chapters**: identity
 | **Concept**: Interface for encrypted identity storage and verification

## Overview

Interface for the IdentityRegistry contract

### Developer Notes

Example for fhEVM Examples - Identity Category

### RegistrarAdded

```solidity
event RegistrarAdded(address registrar)
```

Emitted when a new registrar is authorized

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address of the authorized registrar |

### RegistrarRemoved

```solidity
event RegistrarRemoved(address registrar)
```

Emitted when a registrar's authorization is revoked

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address of the removed registrar |

### IdentityAttested

```solidity
event IdentityAttested(address user, address registrar)
```

Emitted when an identity is attested on-chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the attested user |
| registrar | address | Address of the registrar who performed attestation |

### IdentityRevoked

```solidity
event IdentityRevoked(address user)
```

Emitted when an identity attestation is revoked

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address whose attestation was revoked |

### AccessGranted

```solidity
event AccessGranted(address user, address grantee)
```

Emitted when a user grants access to their encrypted data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user granting access |
| grantee | address | Address receiving access permission |

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

### OnlyRegistrar

```solidity
error OnlyRegistrar()
```

Thrown when caller is not an authorized registrar

### NotAttested

```solidity
error NotAttested()
```

Thrown when querying a user without attestation

### AlreadyAttested

```solidity
error AlreadyAttested()
```

Thrown when attempting to attest an already-attested user

### addRegistrar

```solidity
function addRegistrar(address registrar) external
```

Add a new authorized registrar

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address to authorize as registrar |

### removeRegistrar

```solidity
function removeRegistrar(address registrar) external
```

Remove an authorized registrar

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address to remove from registrars |

### attestIdentity

```solidity
function attestIdentity(address user, externalEuint8 encBirthYearOffset, externalEuint16 encCountryCode, externalEuint8 encKycLevel, externalEbool encIsBlacklisted, bytes inputProof) external
```

Attest a user's encrypted identity data on-chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user being attested |
| encBirthYearOffset | externalEuint8 | Encrypted birth year offset (years since 1900) |
| encCountryCode | externalEuint16 | Encrypted ISO 3166-1 numeric country code |
| encKycLevel | externalEuint8 | Encrypted KYC verification level (0-3) |
| encIsBlacklisted | externalEbool | Encrypted blacklist status |
| inputProof | bytes | FHE proof for encrypted inputs |

### revokeIdentity

```solidity
function revokeIdentity(address user) external
```

Revoke a user's identity attestation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user to revoke |

### getBirthYearOffset

```solidity
function getBirthYearOffset(address user) external view returns (euint8)
```

Get user's encrypted birth year offset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | Encrypted birth year offset (years since 1900) |

### getCountryCode

```solidity
function getCountryCode(address user) external view returns (euint16)
```

Get user's encrypted country code

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint16 | Encrypted ISO 3166-1 numeric country code |

### getKycLevel

```solidity
function getKycLevel(address user) external view returns (euint8)
```

Get user's encrypted KYC level

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | Encrypted KYC verification level (0-3) |

### getBlacklistStatus

```solidity
function getBlacklistStatus(address user) external view returns (ebool)
```

Get user's encrypted blacklist status

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted blacklist status (true if blacklisted) |

### hasMinKycLevel

```solidity
function hasMinKycLevel(address user, uint8 minLevel) external returns (ebool)
```

Check if user has minimum KYC level (encrypted comparison)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |
| minLevel | uint8 | Minimum KYC level required |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result of comparison |

### isFromCountry

```solidity
function isFromCountry(address user, uint16 country) external returns (ebool)
```

Check if user is from a specific country (encrypted comparison)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |
| country | uint16 | ISO 3166-1 numeric country code to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result of comparison |

### isNotBlacklisted

```solidity
function isNotBlacklisted(address user) external returns (ebool)
```

Check if user is not blacklisted (encrypted)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean (true if NOT blacklisted) |

### grantAccessTo

```solidity
function grantAccessTo(address grantee) external
```

Grant a contract access to caller's encrypted identity data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| grantee | address | Address to grant access to |

### isAttested

```solidity
function isAttested(address user) external view returns (bool)
```

Check if a user has been attested

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if user has valid attestation |

### owner

```solidity
function owner() external view returns (address)
```

Get the contract owner address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Owner address |

### pendingOwner

```solidity
function pendingOwner() external view returns (address)
```

Get the pending owner address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Pending owner address |

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

### registrars

```solidity
function registrars(address registrar) external view returns (bool)
```

Check if an address is an authorized registrar

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrar | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if address is authorized registrar |

### attestationTimestamp

```solidity
function attestationTimestamp(address user) external view returns (uint256)
```

Get the timestamp when a user was attested

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address of the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Unix timestamp of attestation (0 if not attested) |

