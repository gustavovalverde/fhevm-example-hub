# fhEVM Examples

Welcome to the fhEVM Examples library. These examples span multiple categories and are designed to help you learn privacy-preserving smart contract patterns step by step.

## Start here

- **[FHE 101 (Plain Language)](fhe-101.md)**
- **[Start Here](start-here.md)**
- **[Common Pitfalls](pitfalls.md)**
- **[Learning Paths](learning-paths.md)**
- Want to browse by topic? See **[Chapters](chapters/README.md)**.

## Example map

### Auctions

| Example | Concept | Difficulty |
| --- | --- | --- |
| [BlindAuction](./auctions/BlindAuction.md) | Sealed-bid auction with encrypted bids and public reveal | Advanced |
| [DutchAuction](./auctions/DutchAuction.md) | Dutch auction with descending price and encrypted reserve | Intermediate |

### Basic

| Example | Concept | Difficulty |
| --- | --- | --- |
| [AntiPatternMissingAllowThis](./basic/AntiPatternMissingAllowThis.md) | Missing FHE.allowThis breaks reuse of stored handles | Intermediate |
| [AntiPatternMissingUserAllow](./basic/AntiPatternMissingUserAllow.md) | Missing FHE.allow(user) blocks user decryption | Intermediate |
| [AntiPatternViewOnEncrypted](./basic/AntiPatternViewOnEncrypted.md) | View functions return encrypted handles, not plaintext | Intermediate |
| [EncryptMultipleValues](./basic/EncryptMultipleValues.md) | Store multiple encrypted values with a single proof | Beginner |
| [EncryptSingleValue](./basic/EncryptSingleValue.md) | Store one encrypted value and grant permissions | Beginner |
| [FHEAdd](./basic/FHEAdd.md) | Add two encrypted values with FHE.add | Beginner |
| [FHECounter](./basic/FHECounter.md) | Encrypted counter using FHE.add and FHE.sub | Beginner |
| [FHEEq](./basic/FHEEq.md) | Compare two encrypted values using FHE.eq | Beginner |
| [FHEIfThenElse](./basic/FHEIfThenElse.md) | Conditional selection on encrypted values using FHE.select | Beginner |
| [FHESub](./basic/FHESub.md) | Subtract two encrypted values with FHE.sub | Beginner |
| [HandleGeneration](./basic/HandleGeneration.md) | Handles are opaque references; FHE ops create derived handles (symbolic execution) | Intermediate |
| [HandleLifecycle](./basic/HandleLifecycle.md) | Store encrypted handles and reuse them across calls | Intermediate |
| [InputProofsExplained](./basic/InputProofsExplained.md) | Input proofs bind encrypted inputs to a contract and sender | Intermediate |
| [PublicDecryptMultipleValues](./basic/PublicDecryptMultipleValues.md) | Public decryption flow for multiple encrypted values | Intermediate |
| [PublicDecryptSingleValue](./basic/PublicDecryptSingleValue.md) | Public decryption flow for a single encrypted value | Intermediate |
| [UserDecryptMultipleValues](./basic/UserDecryptMultipleValues.md) | User decryption flow for multiple encrypted results | Beginner |
| [UserDecryptSingleValue](./basic/UserDecryptSingleValue.md) | User decryption flow for a single encrypted result | Beginner |

### Games

| Example | Concept | Difficulty |
| --- | --- | --- |
| [FHEWordle](./games/FHEWordle.md) | Encrypted letter comparison with branch-free feedback | Intermediate |

### Identity

| Example | Concept | Difficulty |
| --- | --- | --- |
| [AccessControlGrants](./identity/AccessControlGrants.md) | User-controlled FHE.allow() permissions | Intermediate |
| [ComplianceRules](./identity/ComplianceRules.md) | Combining encrypted compliance checks with FHE.and() | Intermediate |
| [CompliantERC20](./identity/CompliantERC20.md) | FHE.select() for branch-free compliant transfers | Advanced |
| [EncryptedAgeVerification](./identity/EncryptedAgeVerification.md) | FHE comparison (le, ge) for threshold checks without revealing values | Beginner |
| [ERC7984ERC20WrapperExample](./identity/ERC7984ERC20WrapperExample.md) | ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap | Advanced |
| [ERC7984Example](./identity/ERC7984Example.md) | Minimal ERC7984 token with confidential mint + transfer | Beginner |
| [ERC7984KycRestricted](./identity/ERC7984KycRestricted.md) | OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance) | Intermediate |
| [ERC7984ObserverAccessExample](./identity/ERC7984ObserverAccessExample.md) | ERC7984ObserverAccess for opt-in audit / compliance observers | Intermediate |
| [IdentityRegistry](./identity/IdentityRegistry.md) | Storing encrypted identity attributes (euint8, euint16, ebool) | Intermediate |
| [SwapERC7984ToERC20](./identity/SwapERC7984ToERC20.md) | ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public) | Advanced |
| [SwapERC7984ToERC7984](./identity/SwapERC7984ToERC7984.md) | ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public) | Intermediate |
| [TransientAccessControl](./identity/TransientAccessControl.md) | FHE.allowTransient() for one-transaction permissions between contracts | Intermediate |
| [VestingWalletConfidentialExample](./identity/VestingWalletConfidentialExample.md) | Confidential vesting (ERC7984) + public KYC gating + factory/clones | Advanced |
