# Identity Examples

Each example in this category is designed to be self-contained and runnable. Start with Beginner examples if you are new to fhEVM.

### Beginner

- **[EncryptedAgeVerification](EncryptedAgeVerification.md)** - FHE comparison (le, ge) for threshold checks without revealing values
- **[ERC7984Example](ERC7984Example.md)** - Minimal ERC7984 token with confidential mint + transfer

### Intermediate

- **[AccessControlGrants](AccessControlGrants.md)** - User-controlled FHE.allow() permissions
- **[ComplianceRules](ComplianceRules.md)** - Combining encrypted compliance checks with FHE.and()
- **[ERC7984KycRestricted](ERC7984KycRestricted.md)** - OpenZeppelin ERC7984Restricted + public KYC allowlist (revert-based compliance)
- **[ERC7984ObserverAccessExample](ERC7984ObserverAccessExample.md)** - ERC7984ObserverAccess for opt-in audit / compliance observers
- **[IdentityRegistry](IdentityRegistry.md)** - Storing encrypted identity attributes (euint8, euint16, ebool)
- **[SwapERC7984ToERC7984](SwapERC7984ToERC7984.md)** - ERC7984 → ERC7984 swap using FHE.allowTransient across token contracts (KYC is public)
- **[TransientAccessControl](TransientAccessControl.md)** - FHE.allowTransient() for one-transaction permissions between contracts

### Advanced

- **[CompliantERC20](CompliantERC20.md)** - FHE.select() for branch-free compliant transfers
- **[ERC7984ERC20WrapperExample](ERC7984ERC20WrapperExample.md)** - ERC7984ERC20Wrapper (ERC20 ↔ ERC7984) + KYC-gated wrap/unwrap
- **[SwapERC7984ToERC20](SwapERC7984ToERC20.md)** - ERC7984 → ERC20 swap using public decryption + FHE.checkSignatures (KYC is public)
- **[VestingWalletConfidentialExample](VestingWalletConfidentialExample.md)** - Confidential vesting (ERC7984) + public KYC gating + factory/clones
