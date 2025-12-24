// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, eaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

// solhint-disable max-line-length
/**
 * @title BlindAuction
 * @author Gustavo Valverde
 * @notice Sealed-bid auction using encrypted bids and confidential payments.
 * @dev Example for fhEVM Examples - Auctions Category
 *
 * @custom:category auctions
 * @custom:chapter auctions
 * @custom:concept Sealed-bid auction with encrypted bids and public reveal
 * @custom:difficulty advanced
 * @custom:depends-on AuctionPaymentToken,PrizeItem,PublicDecryptSingleValue
 * @custom:deploy-plan [{"contract":"PrizeItem","saveAs":"prizeItem"},{"contract":"AuctionPaymentToken","saveAs":"paymentToken","args":["$deployer","Auction USD","AUSD",""]},{"contract":"BlindAuction","saveAs":"auction","args":["@prizeItem","@paymentToken",0,"#Math.floor(Date.now()/1000)","#Math.floor(Date.now()/1000)+3600"],"afterDeploy":["await prizeItem.approve(await auction.getAddress(), 0);","await auction.depositPrize();"]}]
 */
contract BlindAuction is ZamaEthereumConfig, ReentrancyGuard {
// solhint-enable max-line-length
    /// @notice The recipient of the highest bid once the auction ends
    address public beneficiary;

    /// @notice Confidential payment token
    ERC7984 public paymentToken;

    /// @notice Token for the auction prize
    IERC721 public nftContract;
    /// @notice Token ID of the prize NFT
    uint256 public tokenId;
    /// @notice Whether the prize NFT was deposited
    bool public prizeDeposited;

    /// @notice Auction start time (unix timestamp)
    uint256 public auctionStartTime;
    /// @notice Auction end time (unix timestamp)
    uint256 public auctionEndTime;

    /// @notice Encrypted auction state
    euint64 private highestBid;
    eaddress private winningAddress;

    /// @notice Winner address defined at the end of the auction
    address public winnerAddress;

    /// @notice Indicate if the NFT of the auction has been claimed
    bool public isNftClaimed;

    /// @notice Mapping from bidder to their bid value
    mapping(address account => euint64 bidAmount) private bids;

    // ========== Errors ==========

    /// @notice Error thrown when a function is called too early
    error TooEarlyError(uint256 time);

    /// @notice Error thrown when a function is called too late
    error TooLateError(uint256 time);

    /// @notice Thrown when the auction time range is invalid
    error InvalidAuctionTime(uint256 startTime, uint256 endTime);

    /// @notice Thrown when attempting an action that requires the winner to be resolved
    error WinnerNotYetRevealed();

    /// @notice Thrown when the prize was not deposited yet
    error PrizeNotDeposited();

    /// @notice Thrown when a non-beneficiary calls a restricted action
    error OnlyBeneficiary();

    /// @notice Thrown when the prize is already deposited
    error PrizeAlreadyDeposited();

    /// @notice Thrown when a non-winner attempts a winner-only action
    error OnlyWinner();

    /// @notice Thrown when the NFT prize was already claimed
    error NftAlreadyClaimed();

    /// @notice Thrown when no valid winner exists to reveal
    error NoWinnerToReveal();

    /// @notice Thrown when the winning address has already been revealed
    error WinnerAlreadyRevealed();

    /// @notice Thrown when the decryption proof does not match the winning handle
    /// @param expected The expected winning handle
    /// @param provided The provided handle
    error InvalidWinningHandle(bytes32 expected, bytes32 provided);

    // ========== Modifiers ==========

    modifier onlyDuringAuction() {
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auctionStartTime) revert TooEarlyError(auctionStartTime);
        // solhint-disable-next-line not-rely-on-time,gas-strict-inequalities
        if (block.timestamp >= auctionEndTime) revert TooLateError(auctionEndTime);
        _;
    }

    modifier onlyAfterEnd() {
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auctionEndTime) revert TooEarlyError(auctionEndTime);
        _;
    }

    modifier onlyAfterWinnerRevealed() {
        if (winnerAddress == address(0)) revert WinnerNotYetRevealed();
        _;
    }

    // ========== Views ==========

    /// @notice Return the encrypted bid stored for a bidder.
    /// @param account Bidder address
    /// @return The encrypted bid handle
    function getEncryptedBid(address account) external view returns (euint64) {
        return bids[account];
    }

    /// @notice Return the decrypted winner address once revealed.
    /// @return The winner address
    function getWinnerAddress() external view returns (address) {
        if (winnerAddress == address(0)) revert WinnerNotYetRevealed();
        return winnerAddress;
    }

    /**
     * @notice Create the blind auction contract.
     * @param nftContractAddress ERC721 prize contract
     * @param paymentTokenAddress ERC7984 payment token
     * @param prizeTokenId Token ID of the prize NFT
     * @param startTime Auction start timestamp
     * @param endTime Auction end timestamp
     */
    constructor(
        address nftContractAddress,
        address paymentTokenAddress,
        uint256 prizeTokenId,
        uint256 startTime,
        uint256 endTime
    ) {
        // solhint-disable-next-line gas-strict-inequalities
        if (startTime >= endTime) revert InvalidAuctionTime(startTime, endTime);
        beneficiary = msg.sender;
        paymentToken = ERC7984(paymentTokenAddress);
        nftContract = IERC721(nftContractAddress);
        tokenId = prizeTokenId;
        auctionStartTime = startTime;
        auctionEndTime = endTime;
    }

    /// @notice Deposit the NFT prize into the auction contract.
    function depositPrize() external {
        if (msg.sender != beneficiary) revert OnlyBeneficiary();
        if (prizeDeposited) revert PrizeAlreadyDeposited();
        prizeDeposited = true;
        nftContract.transferFrom(msg.sender, address(this), tokenId);
    }

    /// @notice Place an encrypted bid during the auction window.
    /// @param encryptedAmount Encrypted bid amount handle
    /// @param inputProof Proof for the encrypted input
    function bid(externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        onlyDuringAuction
        nonReentrant
    {
        if (!prizeDeposited) revert PrizeNotDeposited();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer confidential payment to the auction contract
        euint64 balanceBefore = paymentToken.confidentialBalanceOf(address(this));
        FHE.allowTransient(amount, address(paymentToken));
        paymentToken.confidentialTransferFrom(msg.sender, address(this), amount);
        euint64 balanceAfter = paymentToken.confidentialBalanceOf(address(this));
        euint64 sentBalance = FHE.sub(balanceAfter, balanceBefore);

        euint64 previousBid = bids[msg.sender];
        if (FHE.isInitialized(previousBid)) {
            bids[msg.sender] = FHE.add(previousBid, sentBalance);
        } else {
            bids[msg.sender] = sentBalance;
        }

        euint64 currentBid = bids[msg.sender];
        FHE.allowThis(currentBid);
        FHE.allow(currentBid, msg.sender);

        if (FHE.isInitialized(highestBid)) {
            ebool isHigher = FHE.lt(highestBid, currentBid);
            ebool hasValidBid = FHE.gt(currentBid, FHE.asEuint64(0));
            ebool isNewWinner = FHE.and(isHigher, hasValidBid);
            highestBid = FHE.select(isNewWinner, currentBid, highestBid);
            winningAddress = FHE.select(isNewWinner, FHE.asEaddress(msg.sender), winningAddress);
        } else {
            ebool hasValidBid = FHE.gt(currentBid, FHE.asEuint64(0));
            highestBid = FHE.select(hasValidBid, currentBid, highestBid);
            winningAddress = FHE.select(hasValidBid, FHE.asEaddress(msg.sender), winningAddress);
        }

        if (FHE.isInitialized(highestBid)) {
            FHE.allowThis(highestBid);
        }
        if (FHE.isInitialized(winningAddress)) {
            FHE.allowThis(winningAddress);
        }
    }

    /// @notice Publish the encrypted winner address and bid for public decryption.
    function requestDecryptWinningAddress() external onlyAfterEnd {
        if (!FHE.isInitialized(winningAddress) || !FHE.isInitialized(highestBid)) {
            revert NoWinnerToReveal();
        }
        FHE.makePubliclyDecryptable(winningAddress);
        FHE.makePubliclyDecryptable(highestBid);
    }

    /// @notice Return the handle for the encrypted winning address.
    /// @return The encrypted winner address handle
    function getWinningAddressHandle() external view returns (bytes32) {
        return FHE.toBytes32(winningAddress);
    }

    /// @notice Return the handle for the encrypted winning bid.
    /// @return The encrypted winning bid handle
    function getWinningBidHandle() external view returns (bytes32) {
        return euint64.unwrap(highestBid);
    }

    /// @notice Claim the NFT prize.
    function winnerClaimPrize() external onlyAfterWinnerRevealed {
        if (!prizeDeposited) revert PrizeNotDeposited();
        if (winnerAddress != msg.sender) revert OnlyWinner();
        if (isNftClaimed) revert NftAlreadyClaimed();
        isNftClaimed = true;

        bids[msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(bids[msg.sender]);
        FHE.allow(bids[msg.sender], msg.sender);

        FHE.allowTransient(highestBid, address(paymentToken));
        paymentToken.confidentialTransfer(beneficiary, highestBid);

        nftContract.transferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Withdraw a bid from the auction (non-winners only).
    /// @param bidder Address of the bidder withdrawing
    function withdraw(address bidder) external onlyAfterWinnerRevealed {
        if (bidder == winnerAddress) revert TooLateError(auctionEndTime);

        euint64 amount = bids[bidder];
        FHE.allowTransient(amount, address(paymentToken));

        euint64 newBid = FHE.asEuint64(0);
        bids[bidder] = newBid;
        FHE.allowThis(newBid);
        FHE.allow(newBid, bidder);

        paymentToken.confidentialTransfer(bidder, amount);
    }

    /// @notice Resolve the auction by verifying the decryption proof for the winner.
    /// @param handlesList Handles signed by the gateway
    /// @param cleartexts Decrypted cleartexts
    /// @param decryptionProof Proof for the gateway signature
    function resolveAuction(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external onlyAfterEnd {
        if (winnerAddress != address(0)) revert WinnerAlreadyRevealed();
        if (!FHE.isInitialized(winningAddress) || !FHE.isInitialized(highestBid)) {
            revert NoWinnerToReveal();
        }
        bytes32 expectedHandle = FHE.toBytes32(winningAddress);
        if (handlesList.length != 2 || handlesList[0] != expectedHandle) {
            bytes32 provided = handlesList.length > 0 ? handlesList[0] : bytes32(0);
            revert InvalidWinningHandle(expectedHandle, provided);
        }
        bytes32 expectedBidHandle = euint64.unwrap(highestBid);
        if (handlesList[1] != expectedBidHandle) {
            revert InvalidWinningHandle(expectedBidHandle, handlesList[1]);
        }
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        (address winner, uint64 winningBidCleartext) = abi.decode(cleartexts, (address, uint64));
        if (winningBidCleartext == 0) revert NoWinnerToReveal();
        winnerAddress = winner;
    }
}
