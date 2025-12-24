# ERC7984KycRestricted

> **Category**: identity
 | **Difficulty**: intermediate
 | **Chapters**: erc7984
 | **Concept**: OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)

## Overview

ERC7984 token with public KYC allowlist enforcement (reverts on non-KYC users)

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### KycNotApproved

```solidity
error KycNotApproved(address account)
```

Error thrown when a non-KYC-approved address attempts an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address that was not KYC-approved |

### constructor

```solidity
constructor(address initialOwner, string name_, string symbol_, string contractURI_) public
```

Initializes the KYC-restricted ERC7984 token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |
| name_ | string | The token name |
| symbol_ | string | The token symbol |
| contractURI_ | string | The contract metadata URI |

### approveKyc

```solidity
function approveKyc(address account) external
```

Mark an address as KYC-approved (allowlisted)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to approve for KYC |

### revokeKyc

```solidity
function revokeKyc(address account) external
```

Mark an address as not KYC-approved (block)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to revoke KYC approval from |

### resetKyc

```solidity
function resetKyc(address account) external
```

Reset an address to default (not allowlisted)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to reset to default status |

### isUserAllowed

```solidity
function isUserAllowed(address account) public view returns (bool)
```

Allowlist policy: only ALLOWED accounts are permitted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the account is KYC-approved (ALLOWED status) |

### mint

```solidity
function mint(address to, externalEuint64 amount, bytes inputProof) external
```

Mint confidential tokens (owner-only)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient (must be KYC-approved) |
| amount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for the encrypted input |

### burn

```solidity
function burn(address from, externalEuint64 amount, bytes inputProof) external
```

Burn confidential tokens (owner-only)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address to burn from (must be KYC-approved) |
| amount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for the encrypted input |

