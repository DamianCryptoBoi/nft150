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
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';

contract ManagerAuction is Initializable, OwnableUpgradeable, PausableUpgradeable, ERC721HolderUpgradeable {
	address public referralContract;
	using SafeMathUpgradeable for uint256;
	using SafeERC20Upgradeable for IERC20Upgradeable;
	using AddressUpgradeable for address payable;

	uint256 public yRefRate;

	mapping(address => bool) public paymentMethod;
	mapping(address => bool) public isPOLKANFTs;

	uint256 public constant ZOOM_USDT = 10**6;
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

	mapping(uint256 => uint256) public auctionBIdCount;

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

	function initialize() public virtual initializer {
		yRefRate = 5000;
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

	function setSystemFee(uint256 _yRefRate) external onlyOwner {
		yRefRate = _yRefRate;
	}

	function addPOLKANFTs(address _polkaNFT, bool _isPOLKANFT) external onlyOwner returns (bool) {
		isPOLKANFTs[_polkaNFT] = _isPOLKANFT;
		return true;
	}

	function setReferralContract(address _referralContract) external onlyOwner {
		referralContract = _referralContract;
	}

	function setPaymentMethod(address _token, bool _status) external onlyOwner returns (bool) {
		paymentMethod[_token] = _status;
		if (_token != address(0)) {
			IERC20Upgradeable(_token).safeApprove(msg.sender, (2**256 - 1));
			IERC20Upgradeable(_token).safeApprove(address(this), (2**256 - 1));
		}
		return true;
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
		Auction memory aut = auctions[bidAuctions[_bidAuctionId].auctionId];
		address payable creator = payable(IPOLKANFT(bidAuction.tokenAddress).getCreator(bidAuction.tokenId));
		uint256 loyaltyFee = IPOLKANFT(bidAuction.tokenAddress).getLoyaltyFee(bidAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(bidAuction.tokenAddress).getXUserFee(bidAuction.tokenId);
		address _paymentToken = bidAuctions[_bidAuctionId].paymentToken;
		uint256 _bidPrice = bidAuctions[_bidAuctionId].bidPrice;
		uint256 _totalEarnings = (_bidPrice * ZOOM_FEE) / (ZOOM_FEE + loyaltyFee + nftXUserFee);

		if (creator != address(0)) {
			_paid(_paymentToken, creator, (_totalEarnings * loyaltyFee) / ZOOM_FEE);
		}

		_paid(_paymentToken, aut.owner, _totalEarnings);
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
}

contract AuctionV3 is ManagerAuction {
	using SafeMathUpgradeable for uint256;
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

		totalAuctions = totalAuctions.add(1);

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

		uint256 loyaltyFee = IPOLKANFT(_tokenAddress).getLoyaltyFee(_tokenId);
		uint256 nftXUserFee = IPOLKANFT(_tokenAddress).getXUserFee(_tokenId);
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
			auctionBIdCount[_auctionId] == 0 || _price > bidAuctions[auctionHighestBidId[_auctionId]].bidPrice,
			'Price-bid-less-than-max-price'
		);

		auctionBIdCount[_auctionId] += 1;

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

		if (msg.value > 0) {
			require(msg.value >= _price, 'Invalid-amount');
			newBidAuction.paymentToken = address(0);
		} else {
			newBidAuction.paymentToken = _paymentToken;
		}

		if (newBidAuction.paymentToken != address(0)) {
			IERC20Upgradeable(newBidAuction.paymentToken).safeTransferFrom(newBidAuction.bidder, address(this), _price);
		}

		adminHoldPayment[_paymentToken] = adminHoldPayment[_paymentToken].add(_price);

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

		require(auctionBIdCount[objEditBidAuction.auctionId] > 0, 'Invalid-bid');

		require(tokenOnAuction[objEditBidAuction.tokenAddress][objEditBidAuction.tokenId], 'Auction-closed');
		require(
			_price > bidAuctions[auctionHighestBidId[objEditBidAuction.auctionId]].bidPrice,
			'price-bid-less-than-max-price'
		);

		auctionBIdCount[objEditBidAuction.auctionId] += 1;

		if (msg.value > 0) {
			require(msg.value >= _price - objEditBidAuction.bidPrice, 'Invalid-amount');
		}

		if (objEditBidAuction.paymentToken != address(0)) {
			IERC20Upgradeable(objEditBidAuction.paymentToken).safeTransferFrom(
				objEditBidAuction.bidder,
				address(this),
				_price - objEditBidAuction.bidPrice
			);
		}
		adminHoldPayment[objEditBidAuction.paymentToken] = adminHoldPayment[objEditBidAuction.paymentToken].add(
			_price - objEditBidAuction.bidPrice
		);

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
		uint256 loyaltyFee = IPOLKANFT(currentAuction.tokenAddress).getLoyaltyFee(currentAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(currentAuction.tokenAddress).getXUserFee(currentAuction.tokenId);

		if (
			bidAuctions[_bidAuctionId].bidPrice >=
			(currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE
		) {
			require(
				bidAuctions[auctionHighestBidId[currentBid.auctionId]].bidPrice > currentBid.bidPrice,
				'Price-bid-less-than-max-price'
			); // the last bid price > this bid price
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

		uint256 loyaltyFee = IPOLKANFT(currentAuction.tokenAddress).getLoyaltyFee(currentAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(currentAuction.tokenAddress).getXUserFee(currentAuction.tokenId);
		require(
			auctionBIdCount[_auctionId] == 0 ||
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

		uint256 loyaltyFee = IPOLKANFT(currentAuction.tokenAddress).getLoyaltyFee(currentAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(currentAuction.tokenAddress).getXUserFee(currentAuction.tokenId);
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

	function claimWinnerAuction(uint256 _bidAuctionId) external whenNotPaused {
		BidAuction storage currentBid = bidAuctions[_bidAuctionId];
		Auction memory currentAuction = auctions[currentBid.auctionId];
		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		uint256 highestBidId = auctionHighestBidId[currentBid.auctionId];
		require(_bidAuctionId == highestBidId, 'Not-highest-bid');
		require(msg.sender == bidAuctions[highestBidId].bidder, 'Not-winner'); // make sure the sender is the winner

		uint256 loyaltyFee = IPOLKANFT(currentAuction.tokenAddress).getLoyaltyFee(currentAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(currentAuction.tokenAddress).getXUserFee(currentAuction.tokenId);
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
}