# Publishing to GitBook

This repo is designed to publish cleanly to GitBook. Use this checklist to keep the docs consistent, searchable, and easy to navigate for new users.

## 1) Generate docs locally

```bash
npm run docs
```

This ensures the GitBook pages match the contract sources and tests.

## 2) Sync the repo to GitBook (Git Sync)

Recommended approach:
- Connect the repo to a GitBook Space using Git Sync.
- Set the sync direction to **repo → GitBook** for the first import.
- Keep the Space as the canonical UI for publishing.

## 3) Publish a Docs site

Once the Space is synced:
- Create a Docs site in GitBook and attach the Space.
- Use **site sections** to separate categories (Basic, Identity, Auctions).
- Use **variants** if you want WIP vs stable docs (or multiple versions).

## 4) Quality checks before publishing

- Run `npm run test:mocked` to ensure examples are runnable.
- Confirm `docs/SUMMARY.md` matches your desired navigation order.
- Check that each example page has:
  - A short concept explanation
  - At least one pitfall test linked in `docs/pitfalls.md`

## 5) Suggested GitBook structure map

- **Site sections**: Basic, Identity, Auctions, Reference
- **Variants**: `stable` (default), `wip` (optional)
- **Landing page**: `docs/README.md`

## 6) Common pitfalls

- Publishing without regenerating docs (stale pages).
- Missing pitfall tests for multi-contract flows.
- Navigation drift between `docs/SUMMARY.md` and the actual content.
