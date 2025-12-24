# CompliantERC20

> **Category**: identity
 | **Difficulty**: advanced
 | **Chapters**: compliance
 | **Concept**: FHE.select() for branch-free compliant transfers

## Overview

ERC20-like token with encrypted balances and compliance checks

### Developer Notes

Example for fhEVM Examples - Identity Category

### name

```solidity
string name
```

Token name

### symbol

```solidity
string symbol
```

Token symbol

### DECIMALS

```solidity
uint8 DECIMALS
```

Token decimals

### totalSupply

```solidity
uint256 totalSupply
```

Total supply (public for transparency)

### complianceChecker

```solidity
contract IComplianceChecker complianceChecker
```

Compliance checker interface (can be ComplianceRules or custom)

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

### Transfer

```solidity
event Transfer(address from, address to)
```

Emitted on token transfers (indexed for efficient filtering)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address tokens are transferred from |
| to | address | Address tokens are transferred to |

### Approval

```solidity
event Approval(address owner, address spender)
```

Emitted when spending allowance is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address of the token owner |
| spender | address | Address authorized to spend |

### Mint

```solidity
event Mint(address to, uint256 amount)
```

Emitted when new tokens are minted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Address receiving the minted tokens |
| amount | uint256 | Number of tokens minted |

### ComplianceCheckerUpdated

```solidity
event ComplianceCheckerUpdated(address newChecker)
```

Emitted when the compliance checker contract is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newChecker | address | Address of the new compliance checker |

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

### ComplianceCheckerNotSet

```solidity
error ComplianceCheckerNotSet()
```

Thrown when compliance checker is required but not set

### UnauthorizedCiphertext

```solidity
error UnauthorizedCiphertext()
```

Thrown when caller supplies an unauthorized ciphertext handle

### TotalSupplyOverflow

```solidity
error TotalSupplyOverflow()
```

Thrown when mint amount would exceed uint64 accounting bounds

### constructor

```solidity
constructor(string tokenName, string tokenSymbol, address checker) public
```

Initialize the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenName | string | Token name |
| tokenSymbol | string | Token symbol |
| checker | address | Address of the compliance checker contract |

### setComplianceChecker

```solidity
function setComplianceChecker(address checker) external
```

Set the compliance checker contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| checker | address | Address of the compliance checker |

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

### mint

```solidity
function mint(address to, uint256 amount) external
```

Mint tokens to an address

_Only owner can mint. Compliance is NOT checked on mint._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| amount | uint256 | Amount to mint (plaintext) |

### transfer

```solidity
function transfer(address to, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Transfer tokens with encrypted amount

_Branch-free transfer with compliance checks_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| encryptedAmount | externalEuint64 | Encrypted amount to transfer |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always returns true (actual transfer amount may be 0) Key insight: We never revert on failed compliance. Instead: - If compliant: transfer the requested amount - If not compliant: transfer 0 (no state change, no info leak) |

### transfer

```solidity
function transfer(address to, euint64 amount) external returns (bool success)
```

Transfer with euint64 amount (for approved callers)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient |
| amount | euint64 | Encrypted amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### approve

```solidity
function approve(address spender, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Approve spender to transfer tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | Address to approve |
| encryptedAmount | externalEuint64 | Encrypted allowance amount |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### transferFrom

```solidity
function transferFrom(address from, address to, externalEuint64 encryptedAmount, bytes inputProof) external returns (bool success)
```

Transfer from another account (requires approval)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Source address |
| to | address | Destination address |
| encryptedAmount | externalEuint64 | Encrypted amount |
| inputProof | bytes | Proof for encrypted input |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always true |

### balanceOf

```solidity
function balanceOf(address account) external view returns (euint64)
```

Get encrypted balance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Address to query |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | Encrypted balance |

### allowance

```solidity
function allowance(address account, address spender) external view returns (euint64)
```

Get encrypted allowance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Owner address |
| spender | address | Spender address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint64 | Encrypted allowance |

### decimals

```solidity
function decimals() external pure returns (uint8)
```

Get decimals

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | Token decimals |

### _transfer

```solidity
function _transfer(address from, address to, euint64 amount) internal returns (bool success)
```

Internal transfer implementation

_The heart of branch-free compliance

Logic flow:
1. Check sender compliance (if checker is set)
2. Check recipient compliance (if checker is set)
3. Check sender has sufficient balance
4. Combine all checks with FHE.and()
5. Use FHE.select() to set transfer amount:
   - If all checks pass: transfer requested amount
   - If any check fails: transfer 0
6. Update balances (even if amount is 0)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Source address |
| to | address | Destination address |
| amount | euint64 | Encrypted amount to transfer |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Always returns true (actual transfer may be 0) |

# IComplianceChecker

## Overview

Interface for compliance checking contracts

### checkCompliance

```solidity
function checkCompliance(address user) external returns (ebool)
```

Check if a user passes compliance requirements

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | Address to check compliance for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | ebool | Encrypted boolean indicating compliance status |

