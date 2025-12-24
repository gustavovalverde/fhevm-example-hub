# SimpleKycRegistry

> **Category**: identity
 | **Difficulty**: beginner

Key patterns:
- Simple boolean allowlist (isKycApproved mapping)
- Owner-controlled KYC status updates
- Emits events for off-chain indexing | **Concept**: Public KYC allowlist for revert-based compliance gating

## Overview

A simple public KYC allowlist for gating operations

### Developer Notes

Shared helper contract for identity examples requiring KYC checks.
     Used by ERC7984ERC20WrapperExample, SwapERC7984ToERC20, SwapERC7984ToERC7984,
     and VestingWalletConfidentialExample.

### isKycApproved

```solidity
mapping(address => bool) isKycApproved
```

Mapping of addresses to their KYC approval status

### KycUpdated

```solidity
event KycUpdated(address account, bool approved)
```

Emitted when a user's KYC status is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address whose KYC status changed |
| approved | bool | The new KYC approval status |

### constructor

```solidity
constructor(address initialOwner) public
```

Creates a new KYC registry with the specified owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own and manage the registry |

### setKyc

```solidity
function setKyc(address account, bool approved) external
```

Updates the KYC status for a given account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address to update |
| approved | bool | The new KYC approval status |

### setKycBatch

```solidity
function setKycBatch(address[] accounts, bool approved) external
```

Batch update KYC status for multiple accounts

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accounts | address[] | The addresses to update |
| approved | bool | The new KYC approval status for all accounts |

