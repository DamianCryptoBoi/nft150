// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './interfaces/IReferral.sol';
import './interfaces/IPOLKANFT.sol';

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';

contract ManagerAuction is Initializable, OwnableUpgradeable, PausableUpgradeable, ERC721HolderUpgradeable {
	address public referralContract;
	using SafeERC20Upgradeable for IERC20Upgradeable;
	using AddressUpgradeable for address payable;

	mapping(address => bool) public paymentMethod;

	uint256 public constant ZOOM_FEE = 10**4;

	uint256 public totalAuctions;
	uint256 public totalBidAuctions;

	bytes4 internal constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
	bytes4 internal constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

	struct Auction {
		address owner;
		address tokenAddress;
		address paymentToken;
		uint256 tokenId;
		uint256 startPrice;
		uint256 reservePrice;
		uint256 startTime;
		uint256 endTime;
		uint256[] listBidId;
	}

	struct BidAuction {
		address bidder;
		address paymentToken;
		address tokenAddress;
		uint256 tokenId;
		uint256 auctionId;
		uint256 bidPrice;
		bool status;
		bool isOwnerAccepted;
		bool isBiderClaimed;
	}

	mapping(uint256 => Auction) public auctions;
	mapping(uint256 => BidAuction) public bidAuctions;

	//hold: createBid
	mapping(address => uint256) public adminHoldPayment;

	mapping(uint256 => mapping(address => bool)) public userJoinAuction;

	mapping(address => mapping(uint256 => bool)) public tokenOnAuction; //tokenAddress => tokenId => bool

	mapping(uint256 => uint256) public auctionHighestBidId; //auctionId => bidId

	mapping(uint256 => uint256) public auctionBidCount;

	event AuctionCreated(uint256 _auctionId, address _tokenAddress, uint256 _tokenId);
	event BidAuctionCreated(
		uint256 indexed _bidAuctionId,
		address _tokenAddress,
		uint256 indexed _tokenId,
		uint256 _price,
		address _paymentToken
	);
	event BidAuctionEdited(uint256 indexed _bidAuctionId, uint256 indexed _oldBidAuctionId, uint256 _price);
	event AuctionCanceled(uint256 indexed _auctionId);
	event BidAuctionCanceled(uint256 indexed _bidAuctionId);
	event BidAuctionAccepted(uint256 indexed _bidAuctionId);
	event BidAuctionClaimed(uint256 indexed _bidAuctionId);
	event AuctionReclaimed(uint256 indexed _auctionId);
	event PaymentMethodChanged(address _paymentToken, bool _accepted);
	event ReferralContractChanged(address _referralContract);
	event FundsWithdrawed(address _tokenAddress, uint256 _amount);

	function initialize() public virtual initializer {
		OwnableUpgradeable.__Ownable_init();
		PausableUpgradeable.__Pausable_init();
		ERC721HolderUpgradeable.__ERC721Holder_init();
	}

	function pause() external onlyOwner {
		_pause();
	}

	function unPause() external onlyOwner {
		_unpause();
	}

	function setReferralContract(address _referralContract) external onlyOwner {
		referralContract = _referralContract;
		emit ReferralContractChanged(_referralContract);
	}

	function setPaymentMethod(address _token, bool _status) external onlyOwner returns (bool) {
		paymentMethod[_token] = _status;
		if (_token != address(0)) {
			IERC20Upgradeable(_token).safeApprove(msg.sender, (2**256 - 1));
			IERC20Upgradeable(_token).safeApprove(address(this), (2**256 - 1));
		}
		emit PaymentMethodChanged(_token, _status);
		return true;
	}

	/**
	 * @notice withdrawFunds
	 */
	function withdrawFunds(address payable _beneficiary, address _tokenAddress) external onlyOwner whenPaused {
		uint256 _withdrawAmount;
		if (_tokenAddress == address(0)) {
			_beneficiary.transfer(address(this).balance);
			_withdrawAmount = address(this).balance;
		} else {
			_withdrawAmount = IERC20Upgradeable(_tokenAddress).balanceOf(address(this));
			IERC20Upgradeable(_tokenAddress).safeTransfer(_beneficiary, _withdrawAmount);
		}
		emit FundsWithdrawed(_tokenAddress, _withdrawAmount);
	}

	function _paid(
		address _token,
		address _to,
		uint256 _amount
	) internal {
		require(_to != address(0), 'Invalid-address');
		if (_token == address(0)) {
			payable(_to).sendValue(_amount);
		} else {
			IERC20Upgradeable(_token).safeTransfer(_to, _amount);
		}
	}

	function _transferAfterAuction(
		address _tokenAddress,
		uint256 _tokenId,
		address _recipient
	) internal {
		IERC721Upgradeable(_tokenAddress).safeTransferFrom(address(this), _recipient, _tokenId);
	}

	function _payBidAuction(uint256 _bidAuctionId) internal {
		BidAuction memory bidAuction = bidAuctions[_bidAuctionId];

		address payable creator = payable(_getCreator(bidAuction.tokenAddress, bidAuction.tokenId));

		uint256 loyaltyFee = _getLoyaltyFee(bidAuction.tokenAddress, bidAuction.tokenId);

		uint256 nftXUserFee = _getXUserFee(bidAuction.tokenAddress, bidAuction.tokenId);

		address _paymentToken = bidAuction.paymentToken;
		uint256 _bidPrice = bidAuction.bidPrice;

		uint256 _totalEarnings = _bidPrice;

		if (loyaltyFee > 0 || nftXUserFee > 0) {
			_totalEarnings = (_bidPrice * ZOOM_FEE) / (ZOOM_FEE + loyaltyFee + nftXUserFee);
		}

		if (creator != address(0) && loyaltyFee > 0) {
			_paid(_paymentToken, creator, (_totalEarnings * loyaltyFee) / ZOOM_FEE);
		}

		_paid(_paymentToken, auctions[bidAuction.auctionId].owner, _totalEarnings);
	}

	function _transferBidAuction(uint256 _bidAuctionId) internal {
		BidAuction storage bidAuction = bidAuctions[_bidAuctionId];
		tokenOnAuction[bidAuction.tokenAddress][bidAuction.tokenId] = false;

		_transferAfterAuction(bidAuction.tokenAddress, bidAuction.tokenId, bidAuction.bidder);
	}

	function _returnBidAuction(uint256 _auctionId) internal {
		Auction memory currentAuction = auctions[_auctionId];
		tokenOnAuction[currentAuction.tokenAddress][currentAuction.tokenId] = false;
		_transferAfterAuction(currentAuction.tokenAddress, currentAuction.tokenId, currentAuction.owner);
	}

	function _getRefData(address _user) internal view returns (address payable) {
		address payable userRef = IReferral(referralContract).getReferral(_user);
		return userRef;
	}

	function _getCreator(address _tokenAddress, uint256 _tokenId) internal view returns (address) {
		try IPOLKANFT(_tokenAddress).getCreator(_tokenId) returns (address _creator) {
			return _creator;
		} catch {}
		return address(0);
	}

	function _getXUserFee(address _tokenAddress, uint256 _tokenId) internal view returns (uint256) {
		try IPOLKANFT(_tokenAddress).getXUserFee(_tokenId) returns (uint256 _xUserFee) {
			return _xUserFee;
		} catch {}
		return 0;
	}

	function _getLoyaltyFee(address _tokenAddress, uint256 _tokenId) internal view returns (uint256) {
		try IPOLKANFT(_tokenAddress).getLoyaltyFee(_tokenId) returns (uint256 _loyaltyFee) {
			return _loyaltyFee;
		} catch {}
		return 0;
	}
}

contract AuctionV3 is Initializable, ManagerAuction {
	using SafeERC20Upgradeable for IERC20Upgradeable;
	using AddressUpgradeable for address payable;

	function initialize() public override initializer {
		ManagerAuction.initialize();
	}

	function isUpgraded() public pure returns (bool) {
		return true;
	}

	function createAuction(
		address _tokenAddress,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _startPrice,
		uint256 _reservePrice,
		uint256 _startTime,
		uint256 _endTime
	) external payable whenNotPaused returns (uint256 _auctionId) {
		require(paymentMethod[_paymentToken], 'Payment-not-support');
		require(_startPrice <= _reservePrice, 'Price-invalid');
		require(_startTime <= _endTime, 'Time-invalid');

		bool isERC721 = IERC721Upgradeable(_tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		require(isERC721, 'Incorrect-token-type');

		require(IERC721Upgradeable(_tokenAddress).ownerOf(_tokenId) == msg.sender, 'Not-owner');

		_auctionId = totalAuctions;

		tokenOnAuction[_tokenAddress][_tokenId] = true;
		IERC721Upgradeable(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

		Auction storage newAuction = auctions[_auctionId];

		newAuction.owner = msg.sender;
		newAuction.tokenAddress = _tokenAddress;
		newAuction.paymentToken = _paymentToken;
		newAuction.tokenId = _tokenId;
		newAuction.startPrice = _startPrice;
		newAuction.reservePrice = _reservePrice;
		newAuction.startTime = _startTime;
		newAuction.endTime = _endTime;

		totalAuctions += 1;

		emit AuctionCreated(_auctionId, _tokenAddress, _tokenId);

		return _auctionId;
	}

	function bidAuction(
		address _tokenAddress,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _auctionId,
		uint256 _price
	) external payable whenNotPaused returns (uint256 _bidAuctionId) {
		require(auctions[_auctionId].paymentToken == _paymentToken, 'Incorrect-payment-method');
		require(auctions[_auctionId].owner != msg.sender, 'Owner-can-not-bid');

		uint256 loyaltyFee = _getLoyaltyFee(_tokenAddress, _tokenId);
		uint256 nftXUserFee = _getXUserFee(_tokenAddress, _tokenId);
		require(
			_price >= (auctions[_auctionId].startPrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Price-lower-than-start-price'
		);
		require(tokenOnAuction[_tokenAddress][_tokenId], 'Auction-closed');

		Auction storage currentAuction = auctions[_auctionId];
		require(block.timestamp >= currentAuction.startTime, 'Not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'Not-in-time-auction');
		require(!userJoinAuction[_auctionId][msg.sender], 'User-joined-auction');

		require(
			auctionBidCount[_auctionId] == 0 || _price > bidAuctions[auctionHighestBidId[_auctionId]].bidPrice,
			'Price-bid-less-than-max-price'
		);

		auctionBidCount[_auctionId] += 1;

		userJoinAuction[_auctionId][msg.sender] = true;

		BidAuction memory newBidAuction;
		newBidAuction.bidder = msg.sender;
		newBidAuction.bidPrice = _price;
		newBidAuction.tokenId = _tokenId;
		newBidAuction.auctionId = _auctionId;
		newBidAuction.tokenAddress = _tokenAddress;
		newBidAuction.status = true;
		newBidAuction.isOwnerAccepted = false;
		newBidAuction.isBiderClaimed = false;
		newBidAuction.paymentToken = _paymentToken;

		if (_paymentToken == address(0)) {
			require(msg.value >= _price, 'Invalid-amount');
		} else {
			IERC20Upgradeable(newBidAuction.paymentToken).safeTransferFrom(newBidAuction.bidder, address(this), _price);
		}

		adminHoldPayment[_paymentToken] += _price;

		bidAuctions[totalBidAuctions] = newBidAuction;
		_bidAuctionId = totalBidAuctions;

		currentAuction.listBidId.push(_bidAuctionId);

		auctionHighestBidId[_auctionId] = _bidAuctionId;

		totalBidAuctions++;

		emit BidAuctionCreated(_bidAuctionId, _tokenAddress, _tokenId, _price, _paymentToken);

		return _bidAuctionId;
	}

	function editBidAuction(uint256 _bidAuctionId, uint256 _price) external payable whenNotPaused returns (uint256) {
		BidAuction storage objEditBidAuction = bidAuctions[_bidAuctionId];
		Auction storage currentAuction = auctions[objEditBidAuction.auctionId];
		require(msg.sender == objEditBidAuction.bidder, 'Not-owner-bid-auction');
		require(block.timestamp >= currentAuction.startTime, 'Not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'Not-in-time-auction');
		require(objEditBidAuction.status, 'Bid-cancelled');

		require(auctionBidCount[objEditBidAuction.auctionId] > 0, 'Invalid-bid');

		require(tokenOnAuction[objEditBidAuction.tokenAddress][objEditBidAuction.tokenId], 'Auction-closed');
		require(
			_price > bidAuctions[auctionHighestBidId[objEditBidAuction.auctionId]].bidPrice,
			'price-bid-less-than-max-price'
		);

		auctionBidCount[objEditBidAuction.auctionId] += 1;

		if (objEditBidAuction.paymentToken == address(0)) {
			require(msg.value >= _price - objEditBidAuction.bidPrice, 'Invalid-amount');
		} else {
			IERC20Upgradeable(objEditBidAuction.paymentToken).safeTransferFrom(
				objEditBidAuction.bidder,
				address(this),
				_price - objEditBidAuction.bidPrice
			);
		}

		adminHoldPayment[objEditBidAuction.paymentToken] += _price - objEditBidAuction.bidPrice;

		objEditBidAuction.status = false;
		uint256 oldBidAuctionId = _bidAuctionId;

		bidAuctions[totalBidAuctions] = objEditBidAuction;
		bidAuctions[totalBidAuctions].status = true;
		bidAuctions[totalBidAuctions].bidPrice = _price;
		_bidAuctionId = totalBidAuctions;

		currentAuction.listBidId.push(totalBidAuctions);

		auctionHighestBidId[objEditBidAuction.auctionId] = totalBidAuctions;

		totalBidAuctions++;

		emit BidAuctionEdited(_bidAuctionId, oldBidAuctionId, _price);

		return _bidAuctionId;
	}

	function cancelAuction(uint256 _auctionId) external whenNotPaused returns (uint256) {
		require(block.timestamp < auctions[_auctionId].startTime, 'Auction-started');

		require(auctions[_auctionId].owner == msg.sender, 'Auction-not-owner');

		Auction storage currentAuction = auctions[_auctionId];
		require(tokenOnAuction[currentAuction.tokenAddress][currentAuction.tokenId], 'Version-cancelled');

		tokenOnAuction[currentAuction.tokenAddress][currentAuction.tokenId] = false;

		_transferAfterAuction(currentAuction.tokenAddress, currentAuction.tokenId, msg.sender);

		emit AuctionCanceled(_auctionId);
		return _auctionId;
	}

	function cancelBidAuction(uint256 _bidAuctionId) external whenNotPaused returns (uint256) {
		BidAuction storage currentBid = bidAuctions[_bidAuctionId];

		require(currentBid.status, 'Bid-closed');
		require(msg.sender == currentBid.bidder, 'Not-owner-bid-auction');

		Auction memory currentAuction = auctions[bidAuctions[_bidAuctionId].auctionId];
		uint256 loyaltyFee = _getLoyaltyFee(currentAuction.tokenAddress, currentAuction.tokenId);
		uint256 nftXUserFee = _getXUserFee(currentAuction.tokenAddress, currentAuction.tokenId);

		if (
			bidAuctions[_bidAuctionId].bidPrice >=
			(currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE
		) {
			require(
				bidAuctions[auctionHighestBidId[currentBid.auctionId]].bidPrice > currentBid.bidPrice,
				'Can-not-cancel-highest-bid'
			);
		}

		userJoinAuction[currentBid.auctionId][msg.sender] = false;
		adminHoldPayment[currentBid.paymentToken] -= currentBid.bidPrice;

		currentBid.status = false;
		if (currentBid.paymentToken == address(0)) {
			payable(currentBid.bidder).sendValue(currentBid.bidPrice);
		} else {
			IERC20Upgradeable(currentBid.paymentToken).safeTransferFrom(
				address(this),
				currentBid.bidder,
				currentBid.bidPrice
			);
		}

		emit BidAuctionCanceled(_bidAuctionId);

		return _bidAuctionId;
	}

	function reclaimAuction(uint256 _auctionId) external whenNotPaused {
		Auction memory currentAuction = auctions[_auctionId];
		uint256 highestBidId = auctionHighestBidId[_auctionId];

		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		require(currentAuction.owner == msg.sender, 'Auction-not-owner');

		uint256 loyaltyFee = _getLoyaltyFee(currentAuction.tokenAddress, currentAuction.tokenId);
		uint256 nftXUserFee = _getXUserFee(currentAuction.tokenAddress, currentAuction.tokenId);
		require(
			auctionBidCount[_auctionId] == 0 ||
				bidAuctions[highestBidId].bidPrice <
				(currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Bid-price-greater-than-reserve-price'
		);
		require(tokenOnAuction[currentAuction.tokenAddress][currentAuction.tokenId], 'Version-cancelled');

		_returnBidAuction(_auctionId);

		emit AuctionReclaimed(_auctionId);
	}

	function acceptBidAuction(uint256 _bidAuctionId) external whenNotPaused {
		BidAuction storage currentBid = bidAuctions[_bidAuctionId];
		Auction memory currentAuction = auctions[currentBid.auctionId];
		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		uint256 highestBidId = auctionHighestBidId[currentBid.auctionId];
		require(_bidAuctionId == highestBidId, 'Not-highest-bid');
		require(currentAuction.owner == msg.sender, 'Auction-not-owner');

		uint256 loyaltyFee = _getLoyaltyFee(currentAuction.tokenAddress, currentAuction.tokenId);
		uint256 nftXUserFee = _getXUserFee(currentAuction.tokenAddress, currentAuction.tokenId);
		require(
			currentBid.bidPrice >= (currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Reserve-price-not-met'
		);
		require(currentBid.status, 'Bid-cancelled');
		require(!currentBid.isOwnerAccepted, 'Bid-accepted');

		_payBidAuction(_bidAuctionId);

		adminHoldPayment[currentBid.paymentToken] -= currentBid.bidPrice;
		currentBid.isOwnerAccepted = true;

		emit BidAuctionAccepted(_bidAuctionId);
	}

	receive() external payable {}

	function claimWinnerAuction(uint256 _bidAuctionId) external whenNotPaused {
		BidAuction storage currentBid = bidAuctions[_bidAuctionId];
		Auction memory currentAuction = auctions[currentBid.auctionId];
		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		uint256 highestBidId = auctionHighestBidId[currentBid.auctionId];
		require(_bidAuctionId == highestBidId, 'Not-highest-bid');
		require(msg.sender == bidAuctions[highestBidId].bidder, 'Not-winner'); // make sure the sender is the winner

		uint256 loyaltyFee = _getLoyaltyFee(currentAuction.tokenAddress, currentAuction.tokenId);
		uint256 nftXUserFee = _getXUserFee(currentAuction.tokenAddress, currentAuction.tokenId);
		require(
			currentBid.bidPrice >= (currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Reserve-price-not-met'
		);
		require(currentBid.status, 'Bid-cancelled');
		require(!currentBid.isBiderClaimed, 'Bid-claimed');

		_transferBidAuction(_bidAuctionId);

		currentBid.isBiderClaimed = true;

		emit BidAuctionClaimed(_bidAuctionId);
	}

	function withdrawSystemFee(address _token, address _recipient) external onlyOwner {
		require(_recipient != address(0), 'Invalid-address');
		uint256 feeAmount;
		if (_token == address(0)) {
			feeAmount = address(this).balance - adminHoldPayment[_token];
			(bool sent, ) = payable(_recipient).call{ value: feeAmount }('');
			require(sent, 'Failed to send Ether');
		} else {
			feeAmount = IERC20Upgradeable(_token).balanceOf(address(this)) - adminHoldPayment[_token];
			IERC20Upgradeable(_token).safeTransfer(_recipient, feeAmount);
		}
	}
}
