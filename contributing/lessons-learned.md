# Lessons Learned (WIP)

This page captures the lessons we want to document while aligning the examples with real usage patterns. It is intentionally practical: each item should translate into a sentence, a diagram label, or a test.

## Lessons learned (what to document)

- **Bind decryption proofs to expected handles.** Never accept arbitrary handles; verify the exact handles your contract published (and in the right order) before trusting cleartext.
- **Use effective amounts, not requested amounts.** Confidential transfers can silently clamp to zero; state changes must be based on the transferred value.
- **Treat async decrypt as one-time.** Record a request, delete it before external calls, then finalize to prevent replay.
- **Prefer transient allowances.** Use `FHE.allowTransient` for cross-contract flows; if persistent access is required, add `FHE.isSenderAllowed` checks at the point of use.
- **Guard encrypted arithmetic.** For any fee, ratio, or limit, include an encrypted overflow/underflow guard and a safe fallback via `FHE.select`.
- **Be explicit about who can decrypt.** Document whether a result is user-decryptable, publicly decryptable, or shared with a third party.
- **Plan disclosure timing when information is the product.** If the output is sensitive or time-dependent, separate “schedule disclosure” from “finalize disclosure.”

## What each example should state (minimum)

1) **Actors and roles**
- Who can call each function (user, operator, owner, relayer)?
- Which contracts are expected to hold encrypted state?

2) **Handle and ACL flow**
- What handles are created?
- Where are `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient`, and `FHE.makePubliclyDecryptable` used?
- What checks enforce caller authorization (`FHE.isSenderAllowed`)?

3) **Decryption flow (if any)**
- User decryption vs public decryption.
- How the proof is verified and which handle(s) must match.

4) **Failure semantics**
- What happens on insufficient balance or failed comparisons?
- Do transfers silently clamp to zero? If so, how is that handled?

5) **Dependencies**
- Which contracts are required and why.
- Any sequencing requirements (e.g., operator approvals, KYC setup).

## Where to capture it

- **Example doc (per contract):** short flow summary + 1 diagram + pitfall list.
- **Tests:** at least one pitfall test that demonstrates the failure mode.
- **Flow Diagrams:** add or update a diagram when the flow involves multiple contracts or async decryption.

