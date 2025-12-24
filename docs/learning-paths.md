# Learning Paths

Use this page to pick examples by difficulty.

## Beginner

- [EncryptedAgeVerification](./identity/EncryptedAgeVerification.md) - FHE comparison (le, ge) for threshold checks without revealing values
- [EncryptMultipleValues](./basic/EncryptMultipleValues.md) - Store multiple encrypted values with a single proof
- [EncryptSingleValue](./basic/EncryptSingleValue.md) - Store one encrypted value and grant permissions
- [ERC7984Example](./identity/ERC7984Example.md) - Minimal ERC7984 token with confidential mint + transfer
- [FHEAdd](./basic/FHEAdd.md) - Add two encrypted values with FHE.add
- [FHECounter](./basic/FHECounter.md) - Encrypted counter using FHE.add and FHE.sub
- [FHEEq](./basic/FHEEq.md) - Compare two encrypted values using FHE.eq
- [FHEIfThenElse](./basic/FHEIfThenElse.md) - Conditional selection on encrypted values using FHE.select
- [FHESub](./basic/FHESub.md) - Subtract two encrypted values with FHE.sub
- [UserDecryptMultipleValues](./basic/UserDecryptMultipleValues.md) - User decryption flow for multiple encrypted results
- [UserDecryptSingleValue](./basic/UserDecryptSingleValue.md) - User decryption flow for a single encrypted result

## Intermediate

- [AccessControlGrants](./identity/AccessControlGrants.md) - User-controlled FHE.allow() permissions
- [AntiPatternMissingAllowThis](./basic/AntiPatternMissingAllowThis.md) - Missing FHE.allowThis breaks reuse of stored handles
- [AntiPatternMissingUserAllow](./basic/AntiPatternMissingUserAllow.md) - Missing FHE.allow(user) blocks user decryption
- [AntiPatternViewOnEncrypted](./basic/AntiPatternViewOnEncrypted.md) - View functions return encrypted handles, not plaintext
- [ComplianceRules](./identity/ComplianceRules.md) - Combining encrypted compliance checks with FHE.and()
- [DutchAuction](./auctions/DutchAuction.md) - Dutch auction with descending price and encrypted reserve
- [ERC7984KycRestricted](./identity/ERC7984KycRestricted.md) - OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)
- [ERC7984ObserverAccessExample](./identity/ERC7984ObserverAccessExample.md) - ERC7984ObserverAccess for opt-in audit / compliance observers
- [FHEWordle](./games/FHEWordle.md) - Encrypted letter comparison with branch-free feedback
- [HandleGeneration](./basic/HandleGeneration.md) - Handles are opaque references; FHE ops create derived handles (symbolic execution)
- [HandleLifecycle](./basic/HandleLifecycle.md) - Store encrypted handles and reuse them across calls
- [IdentityRegistry](./identity/IdentityRegistry.md) - Storing encrypted identity attributes (euint8, euint16, ebool)
- [InputProofsExplained](./basic/InputProofsExplained.md) - Input proofs bind encrypted inputs to a contract and sender
- [PublicDecryptMultipleValues](./basic/PublicDecryptMultipleValues.md) - Public decryption flow for multiple encrypted values
- [PublicDecryptSingleValue](./basic/PublicDecryptSingleValue.md) - Public decryption flow for a single encrypted value
- [SwapERC7984ToERC7984](./identity/SwapERC7984ToERC7984.md) - ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)
- [TransientAccessControl](./identity/TransientAccessControl.md) - FHE.allowTransient() for one-transaction permissions between contracts

## Advanced

- [BlindAuction](./auctions/BlindAuction.md) - Sealed-bid auction with encrypted bids and public reveal
- [CompliantERC20](./identity/CompliantERC20.md) - FHE.select() for branch-free compliant transfers
- [ERC7984ERC20WrapperExample](./identity/ERC7984ERC20WrapperExample.md) - ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap
- [SwapERC7984ToERC20](./identity/SwapERC7984ToERC20.md) - ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)
- [VestingWalletConfidentialExample](./identity/VestingWalletConfidentialExample.md) - Confidential vesting (ERC7984) + public KYC gating + factory/clones
