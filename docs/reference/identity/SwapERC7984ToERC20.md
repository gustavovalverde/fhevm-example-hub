# SwapERC7984ToERC20

> **Category**: identity
 | **Difficulty**: advanced
 | **Chapters**: erc7984,swaps
 | **Concept**: ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)

## Overview

Swap a confidential ERC7984 token amount to a public ERC20 via public decryption finalization

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

### InvalidFinalization

```solidity
error InvalidFinalization(euint64 amount)
```

Error thrown when finalization is called with an invalid amount handle

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | euint64 | The invalid encrypted amount handle |

### fromToken

```solidity
contract IERC7984 fromToken
```

The confidential ERC7984 token to swap from

### toToken

```solidity
contract IERC20 toToken
```

The public ERC20 token to swap to

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### constructor

```solidity
constructor(address initialOwner, contract IERC7984 fromToken_, contract IERC20 toToken_, contract SimpleKycRegistry kyc_) public
```

Initializes the swap contract with token addresses and KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will own the contract |
| fromToken_ | contract IERC7984 | The ERC7984 token to swap from |
| toToken_ | contract IERC20 | The ERC20 token to swap to |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract |

### swapConfidentialToERC20

```solidity
function swapConfidentialToERC20(externalEuint64 encryptedAmount, bytes inputProof) external
```

Swap confidential token amount to public ERC20 (two-step: request + finalize)

_Requires operator approval on the `fromToken` for this contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input (requested swap amount) |
| inputProof | bytes | Proof for the encrypted input Emits `ConfidentialTransfer` on the ERC7984 token; the transferred handle must be publicly decrypted off-chain, then finalized with `finalizeSwap`. |

### swapWithoutAllowingToken

```solidity
function swapWithoutAllowingToken(externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.allowTransient(amount, address(fromToken))` (will revert)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### swapWithoutPublishing

```solidity
function swapWithoutPublishing(externalEuint64 encryptedAmount, bytes inputProof) external
```

Anti-pattern: omit `FHE.makePubliclyDecryptable(amountTransferred)` (finalization becomes impossible)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmount | externalEuint64 | Encrypted amount input |
| inputProof | bytes | Proof for the encrypted input |

### finalizeSwap

```solidity
function finalizeSwap(euint64 amount, uint64 cleartextAmount, bytes decryptionProof) external
```

Finalize a swap using the public decryption proof from `FHE.publicDecrypt`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | euint64 | The encrypted handle that was published during `swapConfidentialToERC20` |
| cleartextAmount | uint64 | Decrypted cleartext amount matching `amount` |
| decryptionProof | bytes | KMS signature proof returned by the public decryption endpoint |

