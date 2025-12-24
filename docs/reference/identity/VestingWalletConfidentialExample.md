# KycVestingWalletConfidential

## Overview

Confidential vesting wallet with KYC-gated releases

### Developer Notes

Clone-compatible implementation using initializer pattern

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry for compliance checks

### NotKycApproved

```solidity
error NotKycApproved(address beneficiary)
```

Error thrown when a non-KYC-approved beneficiary attempts to release

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | The address that was not KYC-approved |

### constructor

```solidity
constructor() public
```

Initializes the implementation contract and disables further initialization

### initialize

```solidity
function initialize(contract SimpleKycRegistry kyc_, address beneficiary, uint48 startTimestamp, uint48 durationSeconds) public
```

Initialize clone state (clones-safe initializer)

_Clones do not run constructors; this configures coprocessor and VestingWallet state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kyc_ | contract SimpleKycRegistry | Public KYC registry |
| beneficiary | address | Address that can release vested tokens |
| startTimestamp | uint48 | Vesting start time (unix seconds) |
| durationSeconds | uint48 | Vesting duration in seconds |

### release

```solidity
function release(address token) public
```

Release vested tokens to the beneficiary (KYC-gated)

_Reverts if beneficiary is not KYC-approved in the public registry._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | ERC7984 token address |

# VestingWalletConfidentialExampleFactory

## Overview

Factory for deploying KYC-gated confidential vesting wallets as clones

### Developer Notes

Uses clone pattern for gas-efficient deployment

### InvalidBeneficiary

```solidity
error InvalidBeneficiary()
```

Error thrown when beneficiary is the zero address

### kyc

```solidity
contract SimpleKycRegistry kyc
```

The KYC registry used for all deployed vesting wallets

### constructor

```solidity
constructor(contract SimpleKycRegistry kyc_) public
```

Initializes the factory with a KYC registry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kyc_ | contract SimpleKycRegistry | The KYC registry contract for compliance checks |

### _deployVestingWalletImplementation

```solidity
function _deployVestingWalletImplementation() internal returns (address)
```

Deploys the vesting wallet implementation contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the deployed implementation |

### _validateVestingWalletInitArgs

```solidity
function _validateVestingWalletInitArgs(bytes initArgs) internal pure
```

Validates the initialization arguments for a new vesting wallet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initArgs | bytes | ABI-encoded (beneficiary, startTimestamp, durationSeconds) |

### _initializeVestingWallet

```solidity
function _initializeVestingWallet(address vestingWalletAddress, bytes initArgs) internal
```

Initializes a newly cloned vesting wallet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingWalletAddress | address | The address of the cloned vesting wallet |
| initArgs | bytes | ABI-encoded (beneficiary, startTimestamp, durationSeconds) |

