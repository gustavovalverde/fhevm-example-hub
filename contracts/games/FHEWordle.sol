// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FHEWordle
 * @author Gustavo Valverde
 * @notice Simplified Wordle game with encrypted word and feedback.
 * @dev Example for fhEVM Examples - Games Category
 *
 * Demonstrates encrypted letter comparison with feedback:
 * - 2 = correct position (green)
 * - 1 = wrong position but in word (yellow)
 * - 0 = not in word (gray)
 *
 * @custom:category games
 * @custom:chapter games
 * @custom:concept Encrypted letter comparison with branch-free feedback
 * @custom:difficulty intermediate
 */
contract FHEWordle is ZamaEthereumConfig, Ownable {
    /// @notice The 5 encrypted letters of the secret word (ASCII codes)
    euint8[5] private secretWord;

    /// @notice Whether the secret word has been set
    bool public wordSet;

    /// @notice Last guess feedback per player (5 values: 0=gray, 1=yellow, 2=green)
    mapping(address player => euint8[5] feedback) private lastFeedback;

    // ========== Errors ==========

    error WordNotSet();
    error WordAlreadySet();

    // ========== Events ==========

    /// @notice Emitted when the secret word is set.
    event WordSet();
    /// @notice Emitted when a player submits a guess.
    /// @param player The player who submitted the guess
    event GuessSubmitted(address indexed player);

    /**
     * @notice Create the FHEWordle game.
     * @param initialOwner Address of the game owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Set the secret 5-letter word.
     * @param letters Array of 5 encrypted ASCII codes for each letter
     * @param inputProof Proof for the encrypted inputs
     */
    function setSecretWord(externalEuint8[5] calldata letters, bytes calldata inputProof) external onlyOwner {
        if (wordSet) revert WordAlreadySet();

        for (uint256 i = 0; i < 5; ++i) {
            secretWord[i] = FHE.fromExternal(letters[i], inputProof);
            FHE.allowThis(secretWord[i]);
        }

        wordSet = true;
        emit WordSet();
    }

    /**
     * @notice Submit a 5-letter guess and receive encrypted feedback.
     * @param guess Array of 5 encrypted ASCII codes for the guess
     * @param inputProof Proof for the encrypted inputs
     *
     * Feedback values per position:
     * - 2: Correct letter in correct position (green)
     * - 1: Letter exists in word but wrong position (yellow)
     * - 0: Letter not in word (gray)
     */
    function submitGuess(externalEuint8[5] calldata guess, bytes calldata inputProof) external {
        if (!wordSet) revert WordNotSet();

        euint8[5] memory guessLetters;
        for (uint256 i = 0; i < 5; ++i) {
            guessLetters[i] = FHE.fromExternal(guess[i], inputProof);
        }

        // Compute feedback for each position
        for (uint256 i = 0; i < 5; ++i) {
            euint8 feedback = _computeFeedback(guessLetters[i], i);
            lastFeedback[msg.sender][i] = feedback;
            FHE.allowThis(feedback);
            FHE.allow(feedback, msg.sender);
        }

        emit GuessSubmitted(msg.sender);
    }

    /**
     * @notice Get the encrypted feedback for the caller's last guess.
     * @param position Position index (0-4)
     * @return The encrypted feedback value
     */
    function getFeedback(uint256 position) external view returns (euint8) {
        return lastFeedback[msg.sender][position];
    }

    /**
     * @notice Compute feedback for a single letter at a position.
     * @param guessLetter The guessed letter
     * @param position The position being checked
     * @return Encrypted feedback: 2=green, 1=yellow, 0=gray
     */
    function _computeFeedback(
        euint8 guessLetter,
        uint256 position
    ) private returns (euint8) {
        // Check for exact match (green = 2)
        ebool isGreen = FHE.eq(guessLetter, secretWord[position]);

        // Check if letter exists anywhere in word (yellow = 1)
        ebool existsInWord = FHE.asEbool(false);
        for (uint256 j = 0; j < 5; ++j) {
            if (j != position) {
                ebool matchesOther = FHE.eq(guessLetter, secretWord[j]);
                existsInWord = FHE.or(existsInWord, matchesOther);
            }
        }

        // Build feedback: green(2) > yellow(1) > gray(0)
        euint8 green = FHE.asEuint8(2);
        euint8 yellow = FHE.asEuint8(1);
        euint8 gray = FHE.asEuint8(0);

        // If green, return 2; else if yellow, return 1; else return 0
        euint8 yellowOrGray = FHE.select(existsInWord, yellow, gray);
        euint8 result = FHE.select(isGreen, green, yellowOrGray);

        return result;
    }
}
