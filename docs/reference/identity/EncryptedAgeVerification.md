# EncryptedAgeVerification

> **Category**: identity
 | **Difficulty**: beginner

This contract allows users to prove they meet an age threshold (e.g., 18+)
without revealing their actual birth year. The birth year is stored encrypted,
and comparisons are performed homomorphically.

Key patterns demonstrated:
1. Storing encrypted data (euint8 for birth year offset)
2. Using FHE.le() for encrypted comparisons
3. Using FHE.allow() and FHE.allowThis() for access control
4. Returning encrypted booleans for privacy-preserving verification | **Chapters**: comparisons
 | **Concept**: FHE comparison (le, ge) for threshold checks without revealing values

## Overview

Demonstrates FHE age threshold verification without revealing actual age

### Developer Notes

Example for fhEVM Examples - Identity Category

### owner

```solidity
address owner
```

Owner who can update the current year

### BirthYearRegistered

```solidity
event BirthYearRegistered(address user)
```

Emitted when a user registers their birth year

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user who registered |

### CurrentYearUpdated

```solidity
event CurrentYearUpdated()
```

Emitted when the current year is updated

### VerificationResultPublished

```solidity
event VerificationResultPublished(address user, uint8 minAge)
```

Emitted when a user makes an age verification result publicly decryptable

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user who published the result |
| minAge | uint8 | The age threshold that was verified |

### OnlyOwner

```solidity
error OnlyOwner()
```

Error when a non-owner tries to update the current year

### NotRegistered

```solidity
error NotRegistered()
```

Error when user has no registered birth year

### NoVerificationResult

```solidity
error NoVerificationResult()
```

Error when there is no stored verification result for a given threshold

### constructor

```solidity
constructor() public
```

Initializes the contract with the deployer as owner and current year as 2024

### registerBirthYear

```solidity
function registerBirthYear(externalEuint8 encryptedBirthYearOffset, bytes inputProof) external
```

Store encrypted birth year offset

_Demonstrates: encrypted input handling + FHE.allowThis() + FHE.allow()_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedBirthYearOffset | externalEuint8 | Encrypted offset from 1900 (e.g., 100 for year 2000) |
| inputProof | bytes | Proof for the encrypted input Example: To store birth year 2000, the offset is 100 (2000 - 1900) |

### isAtLeastAge

```solidity
function isAtLeastAge(address user, uint8 minAge) external returns (ebool)
```

Check if user is at least the specified age

_Demonstrates: FHE.sub() and FHE.ge() for encrypted comparison_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |
| minAge | uint8 | Minimum age threshold (plaintext, e.g., 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean (caller must have permission to decrypt) The calculation: currentYear - birthYear >= minAge Rearranged as: birthYearOffset <= currentYearOffset - minAge This avoids overflow issues |

### isOver18

```solidity
function isOver18(address user) external returns (ebool)
```

Convenience function to check if user is over 18

_Demonstrates: Wrapper pattern for common use cases_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating if user is 18 or older |

### isOver21

```solidity
function isOver21(address user) external returns (ebool)
```

Convenience function to check if user is over 21

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating if user is 21 or older |

### _isAtLeastAge

```solidity
function _isAtLeastAge(address user, uint8 minAge) internal returns (ebool meetsAge)
```

Internal implementation of age check

_Separated to avoid external self-calls which don't work with staticCall_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |
| minAge | uint8 | Minimum age threshold |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| meetsAge | ebool | Encrypted boolean indicating if user meets the age requirement |

### getVerificationResult

```solidity
function getVerificationResult(address user, uint8 minAge) external view returns (ebool)
```

Get the last verification result for a user and age threshold

_Call isAtLeastAge/isOver18/isOver21 first to compute and store the result_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address that was checked |
| minAge | uint8 | Age threshold that was used |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean result (caller must have permission to decrypt) |

### makeVerificationResultPublic

```solidity
function makeVerificationResultPublic(uint8 minAge) external
```

Make a stored verification result publicly decryptable (opt-in)

_Demonstrates: FHE.makePubliclyDecryptable() for public decryption_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minAge | uint8 | Age threshold that was used (must have been computed previously) After calling this, anyone can publicly decrypt the stored boolean result via the relayer. Use this only for attestations you intentionally want to reveal (e.g., "is over 18"). |

### grantVerificationAccess

```solidity
function grantVerificationAccess(address verifier) external
```

Grant access to encrypted result for a third party

_Demonstrates: User-controlled access grants_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| verifier | address | Address that should be able to verify age result After calling this, the verifier can decrypt the stored 18+ verification result (compute it first via isOver18/isAtLeastAge). |

### grantVerificationAccess

```solidity
function grantVerificationAccess(address verifier, uint8 minAge) public
```

Grant access to a stored verification result for a specific threshold

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| verifier | address | Address that should be able to decrypt the verification result |
| minAge | uint8 | Age threshold that was used (must have been computed previously) |

### updateCurrentYear

```solidity
function updateCurrentYear(uint8 newOffset) external
```

Update the current year (owner only)

_In production, this would use a trusted oracle or governance_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOffset | uint8 | New year offset from 1900 |

### isRegistered

```solidity
function isRegistered(address user) external view returns (bool)
```

Check if a user has registered their birth year

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the user has a registered birth year |

