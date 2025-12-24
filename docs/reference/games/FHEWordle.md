# FHEWordle

> **Category**: games
 | **Difficulty**: intermediate | **Chapters**: games
 | **Concept**: Encrypted letter comparison with branch-free feedback

## Overview

Simplified Wordle game with encrypted word and feedback.

### Developer Notes

Example for fhEVM Examples - Games Category

Demonstrates encrypted letter comparison with feedback:
- 2 = correct position (green)
- 1 = wrong position but in word (yellow)
- 0 = not in word (gray)

### wordSet

```solidity
bool wordSet
```

Whether the secret word has been set

### WordNotSet

```solidity
error WordNotSet()
```

### WordAlreadySet

```solidity
error WordAlreadySet()
```

### WordSet

```solidity
event WordSet()
```

Emitted when the secret word is set.

### GuessSubmitted

```solidity
event GuessSubmitted(address player)
```

Emitted when a player submits a guess.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| player | address | The player who submitted the guess |

### constructor

```solidity
constructor(address initialOwner) public
```

Create the FHEWordle game.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | Address of the game owner |

### setSecretWord

```solidity
function setSecretWord(externalEuint8[5] letters, bytes inputProof) external
```

Set the secret 5-letter word.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| letters | externalEuint8[5] | Array of 5 encrypted ASCII codes for each letter |
| inputProof | bytes | Proof for the encrypted inputs |

### submitGuess

```solidity
function submitGuess(externalEuint8[5] guess, bytes inputProof) external
```

Submit a 5-letter guess and receive encrypted feedback.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| guess | externalEuint8[5] | Array of 5 encrypted ASCII codes for the guess |
| inputProof | bytes | Proof for the encrypted inputs Feedback values per position: - 2: Correct letter in correct position (green) - 1: Letter exists in word but wrong position (yellow) - 0: Letter not in word (gray) |

### getFeedback

```solidity
function getFeedback(uint256 position) external view returns (euint8)
```

Get the encrypted feedback for the caller's last guess.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| position | uint256 | Position index (0-4) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint8 | The encrypted feedback value |

