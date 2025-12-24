// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title PrizeItem
 * @author Gustavo Valverde
 * @notice Simple ERC721 prize item for auction examples.
 */
contract PrizeItem is ERC721 {
    uint256 private nextTokenId;

    /// @notice Create the auction prize item collection.
    constructor() ERC721("AuctionItem", "AIT") {}

    /// @notice Mint a new prize item for the caller.
    /// @return tokenId The minted token ID
    function newItem() external returns (uint256 tokenId) {
        tokenId = nextTokenId;
        ++nextTokenId;
        _mint(msg.sender, tokenId);
    }
}
