# IdentityRegistry

> **Category**: identity
 | **Difficulty**: intermediate

This contract maintains an encrypted identity registry where authorized registrars
(typically a backend service) can attest to user identity attributes. All sensitive data
remains encrypted on-chain.

Key patterns demonstrated:
1. Multiple encrypted types (euint8, euint16, ebool)
2. Role-based access control (registrars)
3. Struct-like data storage with mappings
4. FHE permission management (allowThis, allow) | **Chapters**: identity,access-control
 | **Concept**: Storing encrypted identity attributes (euint8, euint16, ebool)

## Overview

On-chain encrypted identity registry for KYC or compliance platforms

### Developer Notes

Example for fhEVM Examples - Identity Category

### attestationTimestamp

```solidity
mapping(address => uint256) attestationTimestamp
```

Timestamp of last attestation

### owner

```solidity
address owner
```

Owner of the registry

### pendingOwner

```solidity
address pendingOwner
```

Pending owner for two-step ownership transfer

### registrars

```solidity
mapping(address => bool) registrars
```

Authorized registrars who can attest identities

### AccessProhibited

```solidity
error AccessProhibited()
```

Thrown when caller lacks permission for encrypted data

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlyRegistrar

```solidity
modifier onlyRegistrar()
```

### constructor

```solidity
constructor() public
```

Initializes the registry with the deployer as owner and initial registrar

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

### getKycLevelResult

```solidity
function getKycLevelResult(address user, uint8 minLevel) external view returns (ebool)
```

Get the last KYC level verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |
| minLevel | uint8 | Level that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### getCountryResult

```solidity
function getCountryResult(address user, uint16 country) external view returns (ebool)
```

Get the last country verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |
| country | uint16 | Country code that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

### getBlacklistResult

```solidity
function getBlacklistResult(address user) external view returns (ebool)
```

Get the last blacklist verification result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result |

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

