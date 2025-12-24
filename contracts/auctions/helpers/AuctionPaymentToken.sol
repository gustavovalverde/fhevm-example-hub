// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title AuctionPaymentToken
 * @author Gustavo Valverde
 * @notice Simple confidential token for auction payments.
 * @dev Helper contract for the BlindAuction example.
 */
contract AuctionPaymentToken is ERC7984, Ownable, ZamaEthereumConfig {
    /**
     * @notice Create the auction payment token.
     * @param initialOwner Owner address for admin actions
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param tokenURI_ Token metadata URI
     */
    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984(name_, symbol_, tokenURI_) Ownable(initialOwner) {}

    /// @notice Mint confidential tokens with a plaintext amount.
    /// @param to Recipient address
    /// @param amount Plaintext amount to mint
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }
}
