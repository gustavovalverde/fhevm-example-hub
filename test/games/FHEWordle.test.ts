/**
 * @title FHEWordle Tests
 * @notice Tests for encrypted Wordle game
 * @dev Uses @fhevm/hardhat-plugin for encrypted input/output handling
 */

import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";

describe("FHEWordle", () => {
  let game: Awaited<ReturnType<typeof deployGame>>;
  let gameAddress: string;
  let owner: HardhatEthersSigner;
  let player: HardhatEthersSigner;

  // ASCII codes for letters
  const toAscii = (char: string) => char.charCodeAt(0);

  async function deployGame() {
    const factory = await hre.ethers.getContractFactory("FHEWordle");
    const deployed = await factory.deploy(owner.address);
    await deployed.waitForDeployment();
    return deployed;
  }

  async function setSecretWord(word: string) {
    const letters = word.split("").map(toAscii);
    const encrypted = hre.fhevm.createEncryptedInput(gameAddress, owner.address);
    for (const letter of letters) {
      encrypted.add8(letter);
    }
    const input = await encrypted.encrypt();

    await game
      .connect(owner)
      .setSecretWord(
        [input.handles[0], input.handles[1], input.handles[2], input.handles[3], input.handles[4]],
        input.inputProof,
      );
  }

  async function submitGuess(signer: HardhatEthersSigner, word: string) {
    const letters = word.split("").map(toAscii);
    const encrypted = hre.fhevm.createEncryptedInput(gameAddress, signer.address);
    for (const letter of letters) {
      encrypted.add8(letter);
    }
    const input = await encrypted.encrypt();

    await game
      .connect(signer)
      .submitGuess(
        [input.handles[0], input.handles[1], input.handles[2], input.handles[3], input.handles[4]],
        input.inputProof,
      );
  }

  async function getFeedback(signer: HardhatEthersSigner): Promise<bigint[]> {
    const results: bigint[] = [];
    for (let i = 0; i < 5; i++) {
      const encrypted = await game.connect(signer).getFeedback(i);
      const clear = await hre.fhevm.userDecryptEuint(
        FhevmType.euint8,
        encrypted,
        gameAddress,
        signer,
      );
      results.push(clear);
    }
    return results;
  }

  before(async () => {
    [owner, player] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    game = await deployGame();
    gameAddress = await game.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(game, "FHEWordle");
  });

  it("returns all green for exact match", async () => {
    // Secret word: "HELLO"
    await setSecretWord("HELLO");

    // Guess: "HELLO" (exact match)
    await submitGuess(player, "HELLO");

    const feedback = await getFeedback(player);
    // All positions should be green (2)
    expect(feedback).to.deep.equal([2n, 2n, 2n, 2n, 2n]);
  });

  it("returns all gray for no matches", async () => {
    // Secret word: "HELLO"
    await setSecretWord("HELLO");

    // Guess: "QUICK" (no letters in common)
    await submitGuess(player, "QUICK");

    const feedback = await getFeedback(player);
    // All positions should be gray (0)
    expect(feedback).to.deep.equal([0n, 0n, 0n, 0n, 0n]);
  });

  it("returns yellow for misplaced letters", async () => {
    // Secret word: "HELLO"
    await setSecretWord("HELLO");

    // Guess: "OLEHL"
    // O at pos 0: exists at pos 4, yellow (1)
    // L at pos 1: exists at pos 2,3, yellow (1)
    // E at pos 2: exists at pos 1, yellow (1)
    // H at pos 3: exists at pos 0, yellow (1)
    // L at pos 4: exists at pos 2,3, yellow (1)
    await submitGuess(player, "OLEHL");

    const feedback = await getFeedback(player);
    expect(feedback).to.deep.equal([1n, 1n, 1n, 1n, 1n]);
  });

  it("returns mixed feedback for partial matches", async () => {
    // Secret word: "HELLO"
    await setSecretWord("HELLO");

    // Guess: "HELPS"
    // H at pos 0: correct position, green (2)
    // E at pos 1: correct position, green (2)
    // L at pos 2: correct position, green (2)
    // P at pos 3: not in word, gray (0)
    // S at pos 4: not in word, gray (0)
    await submitGuess(player, "HELPS");

    const feedback = await getFeedback(player);
    expect(feedback).to.deep.equal([2n, 2n, 2n, 0n, 0n]);
  });

  it("rejects guess before word is set", async () => {
    await expect(submitGuess(player, "HELLO")).to.be.revertedWithCustomError(game, "WordNotSet");
  });

  it("rejects setting word twice", async () => {
    await setSecretWord("HELLO");

    const letters = "WORLD".split("").map(toAscii);
    const encrypted = hre.fhevm.createEncryptedInput(gameAddress, owner.address);
    for (const letter of letters) {
      encrypted.add8(letter);
    }
    const input = await encrypted.encrypt();

    await expect(
      game
        .connect(owner)
        .setSecretWord(
          [
            input.handles[0],
            input.handles[1],
            input.handles[2],
            input.handles[3],
            input.handles[4],
          ],
          input.inputProof,
        ),
    ).to.be.revertedWithCustomError(game, "WordAlreadySet");
  });
});
