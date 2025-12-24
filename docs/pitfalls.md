# Common Pitfalls

This page aggregates known pitfalls called out in the tests.

- **[AccessControlGrants](./identity/AccessControlGrants.md)**
  - should still allow decrypting previously obtained ciphertext after revocation

- **[AntiPatternMissingAllowThis](./basic/AntiPatternMissingAllowThis.md)**
  - should fail when reusing a handle without allowThis

- **[AntiPatternMissingUserAllow](./basic/AntiPatternMissingUserAllow.md)**
  - fails to decrypt when FHE.allow(user) is missing

- **[AntiPatternViewOnEncrypted](./basic/AntiPatternViewOnEncrypted.md)**
  - returns an encrypted handle even in a view call

- **[EncryptedAgeVerification](./identity/EncryptedAgeVerification.md)**
  - should revert when granting access before computing a result
  - should not allow verifier to decrypt without explicit grant
  - should not allow public decrypt before publishing

- **[ERC7984ERC20WrapperExample](./identity/ERC7984ERC20WrapperExample.md)**
  - should reject wrapping for non-KYC users
  - should not allow public decrypt of confidential balances

- **[ERC7984KycRestricted](./identity/ERC7984KycRestricted.md)**
  - should reject minting to non-KYC accounts
  - should revert transfers to non-KYC recipients

- **[ERC7984ObserverAccessExample](./identity/ERC7984ObserverAccessExample.md)**
  - should not grant future access after observer removal, but old ciphertext stays decryptable

- **[InputProofsExplained](./basic/InputProofsExplained.md)**
  - rejects a proof bound to a different sender
  - rejects a proof bound to a different contract

- **[PublicDecryptSingleValue](./basic/PublicDecryptSingleValue.md)**
  - should not allow public decrypt before publishing

- **[SwapERC7984ToERC20](./identity/SwapERC7984ToERC20.md)**
  - should revert swap if operator approval is missing
  - should revert when omitting allowTransient for the token

- **[SwapERC7984ToERC7984](./identity/SwapERC7984ToERC7984.md)**
  - should revert if operator approval is missing
  - should revert if omitting allowTransient for the toToken
  - should revert if omitting allowTransient for the fromToken

- **[TransientAccessControl](./identity/TransientAccessControl.md)**
  - should revert when the registry does not grant transient permission
  - should show that cached handles outlive transient permissions
