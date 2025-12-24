# Basic Examples

Each example in this category is designed to be self-contained and runnable. Start with Beginner examples if you are new to fhEVM.

### Beginner

- **[EncryptMultipleValues](EncryptMultipleValues.md)** - Store multiple encrypted values with a single proof
- **[EncryptSingleValue](EncryptSingleValue.md)** - Store one encrypted value and grant permissions
- **[FHEAdd](FHEAdd.md)** - Add two encrypted values with FHE.add
- **[FHECounter](FHECounter.md)** - Encrypted counter using FHE.add and FHE.sub
- **[FHEEq](FHEEq.md)** - Compare two encrypted values using FHE.eq
- **[FHEIfThenElse](FHEIfThenElse.md)** - Conditional selection on encrypted values using FHE.select
- **[FHESub](FHESub.md)** - Subtract two encrypted values with FHE.sub
- **[UserDecryptMultipleValues](UserDecryptMultipleValues.md)** - User decryption flow for multiple encrypted results
- **[UserDecryptSingleValue](UserDecryptSingleValue.md)** - User decryption flow for a single encrypted result

### Intermediate

- **[AntiPatternMissingAllowThis](AntiPatternMissingAllowThis.md)** - Missing FHE.allowThis breaks reuse of stored handles
- **[AntiPatternMissingUserAllow](AntiPatternMissingUserAllow.md)** - Missing FHE.allow(user) blocks user decryption
- **[AntiPatternViewOnEncrypted](AntiPatternViewOnEncrypted.md)** - View functions return encrypted handles, not plaintext
- **[HandleGeneration](HandleGeneration.md)** - Handles are opaque references; FHE ops create derived handles (symbolic execution)
- **[HandleLifecycle](HandleLifecycle.md)** - Store encrypted handles and reuse them across calls
- **[InputProofsExplained](InputProofsExplained.md)** - Input proofs bind encrypted inputs to a contract and sender
- **[PublicDecryptMultipleValues](PublicDecryptMultipleValues.md)** - Public decryption flow for multiple encrypted values
- **[PublicDecryptSingleValue](PublicDecryptSingleValue.md)** - Public decryption flow for a single encrypted value
