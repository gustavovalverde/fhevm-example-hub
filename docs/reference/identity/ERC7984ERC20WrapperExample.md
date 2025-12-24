# ERC7984ERC20WrapperExample

> **Category**: identity
 | **Difficulty**: advanced
 | **Chapters**: erc7984
 | **Concept**: ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap

## Overview

Wrap a public ERC20 into a confidential ERC7984 token, and unwrap back via public decryption

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### NotKycApproved

```solidity
error NotKycApproved(address account)
```

Error thrown when a non-KYC-approved address attempts an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address that was not KYC-approved |

### constructor

```solidity
constructor(address initialOwner, contract IERC20 underlying_, contract SimpleKycRegistry kyc_) public
```

Initializes the wrapper with underlying token and KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |
| underlying_ | contract IERC20 | The ERC20 token to wrap |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract |

### wrap

```solidity
function wrap(address to, uint256 amount) public
```

Wrap ERC20 into confidential ERC7984 balance (KYC-gated)

_Reverts if caller or recipient is not KYC-approved._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient of the confidential balance |
| amount | uint256 | Cleartext ERC20 amount to wrap |

### unwrap

```solidity
function unwrap(address from, address to, euint64 amount) public
```

Request an unwrap from confidential to public ERC20 (KYC-gated)

_Burns the confidential amount and emits a handle that must be publicly decrypted and finalized._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address whose confidential balance is burned |
| to | address | Recipient of the public ERC20 |
| amount | euint64 | Encrypted amount (handle) |

### unwrap

```solidity
function unwrap(address from, address to, externalEuint64 encryptedAmount, bytes inputProof) public
```

Request an unwrap from confidential to public ERC20 via encrypted input (KYC-gated)

_Convenience overload: converts external input to `euint64` then calls the handle-based unwrap._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address whose confidential balance is burned |
| to | address | Recipient of the public ERC20 |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

