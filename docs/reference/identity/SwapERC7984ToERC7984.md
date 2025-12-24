# SwapERC7984ToERC7984

> **Category**: identity
 | **Difficulty**: intermediate
 | **Chapters**: erc7984,swaps
 | **Concept**: ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)

## Overview

Swap one confidential ERC7984 token for another using transient permissions

### Developer Notes

Example for fhEVM Examples - OpenZeppelin Confidential Contracts

### NotKycApproved

```solidity
error NotKycApproved(address account)
```

Error thrown when a non-KYC-approved address attempts an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address that was not KYC-approved |

### NotOperator

```solidity
error NotOperator(address caller, address token)
```

Error thrown when caller is not an approved operator for the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | The address attempting the operation |
| token | address | The token that requires operator approval |

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### constructor

```solidity
constructor(contract SimpleKycRegistry kyc_) public
```

Initializes the swap contract with KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract |

### swapConfidentialForConfidential

```solidity
function swapConfidentialForConfidential(contract IERC7984 fromToken, contract IERC7984 toToken, externalEuint64 encryptedAmount, bytes inputProof) external
```

Swap confidential amount from one ERC7984 token to another

_Requires operator approval on the `fromToken` for this contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fromToken | contract IERC7984 | ERC7984 token to transfer from the user into the swap |
| toToken | contract IERC7984 | ERC7984 token to transfer from the swap to the user |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### swapWithoutAllowingToToken

```solidity
function swapWithoutAllowingToToken(contract IERC7984 fromToken, contract IERC7984 toToken, externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.allowTransient(amountTransferred, address(toToken))` (will revert)

_Included to demonstrate a common integration pitfall._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fromToken | contract IERC7984 | ERC7984 token to transfer from the user |
| toToken | contract IERC7984 | ERC7984 token to transfer to the user |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### swapWithoutAllowingFromToken

```solidity
function swapWithoutAllowingFromToken(contract IERC7984 fromToken, contract IERC7984 toToken, externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)

_Included to demonstrate why token contracts need permission to consume ciphertext inputs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fromToken | contract IERC7984 | ERC7984 token to transfer from the user |
| toToken | contract IERC7984 | ERC7984 token to transfer to the user |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

