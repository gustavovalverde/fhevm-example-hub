// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title MintableConfidentialToken
 * @author Gustavo Valverde
 * @notice A mintable ERC7984 token for testing identity examples
 * @dev Shared helper contract providing a simple mintable confidential token.
 *      Used by SwapERC7984ToERC20, SwapERC7984ToERC7984, and VestingWalletConfidentialExample.
 *
 * @custom:category identity
 * @custom:concept Mintable ERC7984 for testing confidential token workflows
 * @custom:difficulty beginner
 *
 * Key patterns:
 * - Owner-controlled minting of confidential balances
 * - Accepts encrypted amounts with FHE proofs
 * - Configurable name, symbol, and metadata URI
 */
contract MintableConfidentialToken is ERC7984, Ownable, ZamaEthereumConfig {
    /// @notice Creates a new mintable confidential token
    /// @param initialOwner The address that will own and mint tokens
    /// @param name_ The token name
    /// @param symbol_ The token symbol
    /// @param tokenURI_ The metadata URI for the token
    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984(name_, symbol_, tokenURI_) Ownable(initialOwner) {}

    /// @notice Mints confidential tokens to an address
    /// @param to The recipient address
    /// @param amount The encrypted amount to mint
    /// @param inputProof The FHE proof for the encrypted input
    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }
}
