# Contributing Guide

This repository is the "hub" repo: it contains example contracts/tests plus automation tooling to generate standalone, Hardhat-based fhEVM example repositories.

## Audience and doc boundaries

- `docs/` is user-facing documentation intended to publish to GitBook.
- `contributing/` is contributor-only documentation (process, publishing, internal lessons).
- Keep contributor workflow notes out of `docs/` unless they are meant for end users.

## Repo Map

- `base-template/` – Hardhat template checkout (git submodule of `zama-ai/fhevm-hardhat-template`) used as a scaffolding source.
- `contracts/<category>/` – example contracts (one clear concept per contract).
- `test/<category>/` – tests running in fhEVM mocked mode via `@fhevm/hardhat-plugin`.
- `scripts/`
  - `scripts/example-registry.ts` – discovers examples by scanning `contracts/**`.
  - `scripts/create-fhevm-example.ts` – generates a single standalone example repo.
  - `scripts/create-fhevm-category.ts` – generates a category bundle (multiple standalone repos).
  - `scripts/generate-gitbook.ts` – generates GitBook pages (contract + test tabs, onboarding pages).
  - `scripts/generate-summary.ts` – generates GitBook `SUMMARY.md` from contract metadata.
- `docs/` – generated GitBook docs (intro, onboarding, examples).
- `docs/reference/` – auto-generated contract reference from Solidity docgen.

## First-time Contribution Flow

1. **Install dependencies**: `npm install`
2. **Ensure template**: `npm run ensure-template`
3. **Create or update an example** (contract + test)
4. **Validate**: `npm run verify`
5. **Regenerate docs**: `npm run docs`

## Add A New Example

1. **Add the contract**
   - Create `contracts/<category>/<ContractName>.sol`.
   - Include NatSpec tags used by the doc generator:
     - `@title`, `@notice`, `@dev`
     - `@custom:category`, `@custom:chapter`, `@custom:concept`, `@custom:difficulty`

   **Required NatSpec tags:**

   ```solidity
   /**
    * @title YourContract
    * @author Your Name
    * @notice Brief description of what this example demonstrates.
    * @dev Additional technical details.
    *
    * @custom:category basic|identity|auctions|games
    * @custom:chapter chapter-name
    * @custom:concept One-line concept summary
    * @custom:difficulty beginner|intermediate|advanced
    */
   ```

   **Optional tags for complex examples:**

   ```solidity
    * @custom:depends-on HelperContract,MockContract
    * @custom:deploy-plan [{"contract":"Helper","saveAs":"helper"},{"contract":"Main","args":["@helper"]}]
   ```

2. **Add tests**
   - Create `test/<category>/<ContractName>.test.ts`.
   - Use fhEVM mocked helpers (`hre.fhevm.*`) and include a short TSDoc header comment at the top.

   **Test template:**

   ```typescript
   import { FhevmType } from "@fhevm/hardhat-plugin";
   import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
   import { expect } from "chai";
   import hre from "hardhat";

   describe("YourContract", () => {
     let contract: Awaited<ReturnType<typeof deployContract>>;
     let contractAddress: string;
     let user: HardhatEthersSigner;

     async function deployContract() {
       const factory = await hre.ethers.getContractFactory("YourContract");
       const deployed = await factory.deploy();
       await deployed.waitForDeployment();
       return deployed;
     }

     before(async () => {
       [, user] = await hre.ethers.getSigners();
     });

     beforeEach(async () => {
       contract = await deployContract();
       contractAddress = await contract.getAddress();
       await hre.fhevm.assertCoprocessorInitialized(contract, "YourContract");
     });

     it("does something with encrypted values", async () => {
       const encrypted = hre.fhevm.createEncryptedInput(contractAddress, user.address);
       encrypted.add64(42);
       const input = await encrypted.encrypt();

       await contract.connect(user).yourMethod(input.handles[0], input.inputProof);

       const encryptedResult = await contract.getResult();
       const clear = await hre.fhevm.userDecryptEuint(
         FhevmType.euint64,
         encryptedResult,
         contractAddress,
         user,
       );

       expect(clear).to.equal(42n);
     });
   });
   ```

3. **Validate**
   - `npm run verify` (lint + typecheck + compile + test)
   - `npm run lint:tags` (validate contract tags)
   - Pre-commit will run `npm run docs` when doc inputs change and will fail if docs are out of date.

4. **Generate docs**
   - `npm run docs:one -- your-example-name`
   - `npm run docs`

## Category Guidelines

| Category | Description | Examples |
|----------|-------------|----------|
| `basic` | Core FHE operations and patterns | FHEAdd, FHECounter, encryption/decryption |
| `identity` | Identity, KYC, and compliance | Age verification, access control, ERC7984 |
| `auctions` | Auction mechanics | BlindAuction, DutchAuction |
| `games` | Game logic with FHE | FHEWordle |

## Contributor Docs

- `contributing/lessons-learned.md` for implementation lessons that should become tests or example notes.
- `contributing/publishing-gitbook.md` for internal publishing steps.

## Generate A Standalone Example Repo

```bash
npm run create <example-slug> ./output/<repo-name>
cd ./output/<repo-name>
npm install
npm run test:mocked
```

## Generate A Category Bundle

```bash
npm run create:category identity ./output/category-identity
```

Each generated example under the category directory is a runnable standalone repo.

## Update `base-template/` And Dependencies

`base-template/` is intended to track Zama's official template structure closely.

- If the template folder is missing or empty (common when cloning without submodules, or downloading a ZIP), run `npm run ensure-template`. This will try `git submodule update --init --recursive` when possible, otherwise it will clone the upstream template into the expected folder.
- You can also point the generators at a custom template path via `FHEVM_TEMPLATE_DIR=/absolute/or/relative/path`.
- To update the `base-template/` submodule pointer, run `git submodule update --remote --merge base-template` (or checkout a specific ref inside `base-template/`), then commit the updated gitlink and `.gitmodules`.
- When bumping fhEVM deps, keep versions aligned across:
  - root `package.json`
  - `generatePackageJson()` in `scripts/create-fhevm-example.ts` and `scripts/create-fhevm-category.ts`

### Update @fhevm/solidity

1. Update the version in `package.json`.
2. Run `npm install`.
3. Test all contracts with `npm run verify`.

### Update OpenZeppelin Confidential Contracts

1. Update the version in `package.json`.
2. Run `npm install`.
3. Check for breaking changes in identity examples.

## Running CI/CD Locally

The `validate:scratch` script mimics the CI pipeline:

```bash
npm run validate:scratch
```

This:
1. Initializes git submodules.
2. Installs fresh dependencies.
3. Runs linting and compilation.
4. Runs all tests.
5. Regenerates documentation.
6. Smoke-tests generated standalone repos.



## Available Scripts

| Script | What It Does |
|--------|--------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run test:mocked` | Run tests with fhEVM mocked precompiles |
| `npm run lint` | Lint TypeScript/JavaScript with Biome |
| `npm run lint:sol` | Lint Solidity with Solhint |
| `npm run typecheck` | TypeScript type checking |
| `npm run check` | Lint + typecheck + compile (no tests) |
| `npm run fix` | Auto-fix formatting and lint issues |
| `npm run verify` | Full validation: lint + typecheck + compile + test |
| `npm run docs` | Generate GitBook docs + reference docs |
| `npm run docs:one` | Generate docs for a single example |
| `npm run create` | Create a standalone example repo |
| `npm run create:category` | Create a category bundle with multiple examples |
| `npm run examples` | List example slugs |
| `npm run categories` | List categories |
| `npm run catalog` | Generate docs/catalog.json |
| `npm run validate:all` | Generate and test all examples |
| `npm run clean:generated` | Remove generated outputs |
| `npm run quickstart` | One-command example generation + test |
| `npm run help` | Print common commands |
| `npm run ensure-template` | Ensure `base-template/` exists (submodule init or clone fallback) |
| `npm run validate` | Repeatable validation (optionally `--clean`) |
| `npm run validate:scratch` | End-to-end validation from scratch (idempotent) |

**Recommended workflow:**
- For quick iteration: `npm run test:mocked`
- Before committing: `npm run verify && npm run docs`
- For clean, repeatable validation: `npm run validate:scratch`

## Common Gotchas (fhEVM)

- If a contract uses `FHE.asEuint*()` in a constructor, tests will revert unless the Hardhat project imports `@fhevm/hardhat-plugin` (mocked precompiles).
- If you return encrypted values/results, remember:
  - `FHE.allowThis(value)` is required for the contract to operate on encrypted values.
  - `FHE.allow(value, addr)` is required for `addr` to decrypt.
