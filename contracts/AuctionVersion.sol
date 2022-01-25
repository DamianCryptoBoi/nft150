// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './interfaces/IReferral.sol';
import './interfaces/IPOLKANFT.sol';
import './upgradeable/IERC1155Upgradeable.sol';

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol';

contract ManagerAuction is
	Initializable,
	OwnableUpgradeable,
	PausableUpgradeable,
	ERC1155HolderUpgradeable,
	ERC721HolderUpgradeable
{
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
		uint256 fromVersion;
		uint256 toVersion;
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
		uint256 version;
	}

	mapping(uint256 => Auction) public auctions;
	mapping(uint256 => BidAuction) public bidAuctions;

	//hold: createBid
	mapping(address => uint256) public adminHoldPayment;

	mapping(uint256 => mapping(uint256 => mapping(address => bool))) public userJoinAuction;

	mapping(address => mapping(uint256 => mapping(uint256 => bool))) public versionOnAuction;

	mapping(uint256 => mapping(uint256 => uint256)) public versionHighestBidId;

	mapping(uint256 => mapping(uint256 => uint256)) public versionBidCount;

	event AuctionCreated(
		uint256 _auctionId,
		address _tokenAddress,
		uint256 _tokenId,
		uint256 _fromVersion,
		uint256 _toVersion
	);
	event BidAuctionCreated(
		uint256 indexed _bidAuctionId,
		address _tokenAddress,
		uint256 indexed _tokenId,
		uint256 _price,
		address _paymentToken,
		uint256 _version
	);
	event BidAuctionEdited(uint256 indexed _bidAuctionId, uint256 indexed _oldBidAuctionId, uint256 _price);
	event AuctionCanceled(uint256 indexed _auctionId, uint256 indexed _version);
	event BidAuctionCanceled(uint256 indexed _bidAuctionId);
	event BidAuctionAccepted(uint256 indexed _bidAuctionId);
	event BidAuctionClaimed(uint256 indexed _bidAuctionId);
	event AuctionReclaimed(uint256 indexed _auctionId, uint256 indexed _version);

	function initialize() public virtual initializer {
		yRefRate = 5000;
		OwnableUpgradeable.__Ownable_init();
		PausableUpgradeable.__Pausable_init();
		ERC1155HolderUpgradeable.__ERC1155Holder_init();
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
		uint256 _version,
		address _recipient,
		bool _isERC721
	) internal {
		if (_isERC721) {
			IERC721Upgradeable(_tokenAddress).safeTransferFrom(address(this), _recipient, _tokenId);
		} else {
			IERC1155Upgradeable(_tokenAddress).setNftOwnVersion(_tokenId, _version, _recipient);
			IERC1155Upgradeable(_tokenAddress).setNftOnSaleVersion(_tokenId, _version, false);
			IERC1155Upgradeable(_tokenAddress).safeTransferFrom(address(this), _recipient, _tokenId, 1, '0x');
		}
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
		versionOnAuction[bidAuction.tokenAddress][bidAuction.tokenId][bidAuction.version] = false;

		bool isERC721 = IERC721Upgradeable(bidAuction.tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		_transferAfterAuction(
			bidAuction.tokenAddress,
			bidAuction.tokenId,
			bidAuction.version,
			bidAuction.bidder,
			isERC721
		);
	}

	function _returnBidAuction(uint256 _auctionId, uint256 _version) internal {
		Auction memory currentAuction = auctions[_auctionId];
		versionOnAuction[currentAuction.tokenAddress][currentAuction.tokenId][_version] = false;
		bool isERC721 = IERC721Upgradeable(currentAuction.tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		_transferAfterAuction(
			currentAuction.tokenAddress,
			currentAuction.tokenId,
			_version,
			currentAuction.owner,
			isERC721
		);
	}

	function _getRefData(address _user) internal view returns (address payable) {
		address payable userRef = IReferral(referralContract).getReferral(_user);
		return userRef;
	}
}

contract AuctionVersion is ManagerAuction {
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
		uint256 _endTime,
		uint256 _fromVersion,
		uint256 _toVersion
	) external payable whenNotPaused returns (uint256 _auctionId) {
		require(paymentMethod[_paymentToken], 'Payment-not-support');
		require(_startPrice <= _reservePrice, 'Price-invalid');
		require(_startTime <= _endTime, 'Time-invalid');
		require(_toVersion >= _fromVersion, 'Version-invalid');

		bool isERC721 = IERC721Upgradeable(_tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);

		uint256 balance = isERC721
			? ((IERC721Upgradeable(_tokenAddress).ownerOf(_tokenId) == msg.sender) ? 1 : 0)
			: IERC1155Upgradeable(_tokenAddress).balanceOf(msg.sender, _tokenId);
		require(balance >= (_toVersion - _fromVersion + 1), 'Insufficient-token-balance');

		_auctionId = totalAuctions;

		if (isERC721) {
			versionOnAuction[_tokenAddress][_tokenId][1] = true;
			IERC721Upgradeable(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
		} else {
			for (uint256 i = _fromVersion; i <= _toVersion; i++) {
				require(!IERC1155Upgradeable(_tokenAddress).nftOnSaleVersion(_tokenId, i), 'Version-on-sale');
				require(
					IERC1155Upgradeable(_tokenAddress).nftOwnVersion(_tokenId, i) == msg.sender,
					'Version-not-of-sender'
				);
				require(!versionOnAuction[_tokenAddress][_tokenId][i], 'Version-on-auction');
				versionOnAuction[_tokenAddress][_tokenId][i] = true;
			}
			IERC1155Upgradeable(_tokenAddress).safeTransferFrom(
				msg.sender,
				address(this),
				_tokenId,
				_toVersion - _fromVersion + 1,
				'0x'
			);
		}

		Auction storage newAuction = auctions[_auctionId];

		newAuction.owner = msg.sender;
		newAuction.tokenAddress = _tokenAddress;
		newAuction.paymentToken = _paymentToken;
		newAuction.tokenId = _tokenId;
		newAuction.startPrice = _startPrice;
		newAuction.reservePrice = _reservePrice;
		newAuction.startTime = _startTime;
		newAuction.endTime = _endTime;
		newAuction.fromVersion = _fromVersion;
		newAuction.toVersion = _toVersion;

		totalAuctions = totalAuctions.add(1);

		emit AuctionCreated(_auctionId, _tokenAddress, _tokenId, _fromVersion, _toVersion);

		return _auctionId;
	}

	function bidAuction(
		address _tokenAddress,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _auctionId,
		uint256 _price,
		uint256 _version
	) external payable whenNotPaused returns (uint256 _bidAuctionId) {
		require(auctions[_auctionId].paymentToken == _paymentToken, 'Incorrect-payment-method');
		require(auctions[_auctionId].owner != msg.sender, 'Owner-can-not-bid');

		uint256 loyaltyFee = IPOLKANFT(_tokenAddress).getLoyaltyFee(_tokenId);
		uint256 nftXUserFee = IPOLKANFT(_tokenAddress).getXUserFee(_tokenId);
		require(
			_price >= (auctions[_auctionId].startPrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Price-lower-than-start-price'
		);
		require(versionOnAuction[_tokenAddress][_tokenId][_version], 'Version-cancelled');

		Auction storage currentAuction = auctions[_auctionId];
		require(block.timestamp >= currentAuction.startTime, 'Not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'Not-in-time-auction');
		require(!userJoinAuction[_auctionId][_version][msg.sender], 'User-joined-auction');

		require(
			versionBidCount[_auctionId][_version] == 0 ||
				_price > bidAuctions[versionHighestBidId[_auctionId][_version]].bidPrice,
			'Price-bid-less-than-max-price'
		);

		versionBidCount[_auctionId][_version] += 1;

		userJoinAuction[_auctionId][_version][msg.sender] = true;

		BidAuction memory newBidAuction;
		newBidAuction.bidder = msg.sender;
		newBidAuction.bidPrice = _price;
		newBidAuction.tokenId = _tokenId;
		newBidAuction.auctionId = _auctionId;
		newBidAuction.tokenAddress = _tokenAddress;
		newBidAuction.version = _version;
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

		versionHighestBidId[_auctionId][_version] = _bidAuctionId;

		totalBidAuctions++;

		emit BidAuctionCreated(_bidAuctionId, _tokenAddress, _tokenId, _price, _paymentToken, _version);

		return _bidAuctionId;
	}

	function editBidAuction(uint256 _bidAuctionId, uint256 _price) external payable whenNotPaused returns (uint256) {
		BidAuction storage objEditBidAuction = bidAuctions[_bidAuctionId];
		Auction storage currentAuction = auctions[objEditBidAuction.auctionId];
		require(msg.sender == objEditBidAuction.bidder, 'Not-owner-bid-auction');
		require(block.timestamp >= currentAuction.startTime, 'Not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'Not-in-time-auction');
		require(objEditBidAuction.status, 'Bid-cancelled');

		require(versionBidCount[objEditBidAuction.auctionId][objEditBidAuction.version] > 0, 'Invalid-bid');

		require(
			versionOnAuction[objEditBidAuction.tokenAddress][objEditBidAuction.tokenId][objEditBidAuction.version],
			'Version-cancelled'
		);
		require(
			_price > bidAuctions[versionHighestBidId[objEditBidAuction.auctionId][objEditBidAuction.version]].bidPrice,
			'price-bid-less-than-max-price'
		);

		versionBidCount[objEditBidAuction.auctionId][objEditBidAuction.version] += 1;

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

		versionHighestBidId[objEditBidAuction.auctionId][objEditBidAuction.version] = totalBidAuctions;

		totalBidAuctions++;

		emit BidAuctionEdited(_bidAuctionId, oldBidAuctionId, _price);

		return _bidAuctionId;
	}

	function cancelAuction(uint256 _auctionId, uint256 _version) external whenNotPaused returns (uint256) {
		require(block.timestamp < auctions[_auctionId].startTime, 'Auction-started');

		require(auctions[_auctionId].owner == msg.sender, 'Auction-not-owner');

		bool isERC721 = IERC721Upgradeable(auctions[_auctionId].tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		Auction storage currentAuction = auctions[_auctionId];
		require(versionOnAuction[currentAuction.tokenAddress][currentAuction.tokenId][_version], 'Version-cancelled');

		require(
			currentAuction.toVersion >= _version && _version >= currentAuction.fromVersion && _version >= 1,
			'Invalid-version'
		);
		versionOnAuction[currentAuction.tokenAddress][currentAuction.tokenId][_version] = false;

		_transferAfterAuction(currentAuction.tokenAddress, currentAuction.tokenId, _version, msg.sender, isERC721);

		emit AuctionCanceled(_auctionId, _version);
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
				bidAuctions[versionHighestBidId[currentBid.auctionId][currentBid.version]].bidPrice >
					currentBid.bidPrice,
				'Price-bid-less-than-max-price'
			); // the last bid price > this bid price
		}

		userJoinAuction[currentBid.auctionId][currentBid.version][msg.sender] = false;
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

	function reclaimAuction(uint256 _auctionId, uint256 _version) external whenNotPaused {
		Auction memory currentAuction = auctions[_auctionId];
		uint256 highestBidId = versionHighestBidId[_auctionId][_version];

		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		require(currentAuction.owner == msg.sender, 'Auction-not-owner');

		uint256 loyaltyFee = IPOLKANFT(currentAuction.tokenAddress).getLoyaltyFee(currentAuction.tokenId);
		uint256 nftXUserFee = IPOLKANFT(currentAuction.tokenAddress).getXUserFee(currentAuction.tokenId);
		require(
			versionBidCount[_auctionId][_version] == 0 ||
				bidAuctions[highestBidId].bidPrice <
				(currentAuction.reservePrice * (ZOOM_FEE + loyaltyFee + nftXUserFee)) / ZOOM_FEE,
			'Bid-price-greater-than-reserve-price'
		);
		require(versionOnAuction[currentAuction.tokenAddress][currentAuction.tokenId][_version], 'Version-cancelled');

		require(
			currentAuction.toVersion >= _version && _version >= currentAuction.fromVersion && _version >= 1,
			'Invalid-version'
		);

		_returnBidAuction(_auctionId, _version);

		emit AuctionReclaimed(_auctionId, _version);
	}

	function acceptBidAuction(uint256 _bidAuctionId) external whenNotPaused {
		BidAuction storage currentBid = bidAuctions[_bidAuctionId];
		Auction memory currentAuction = auctions[currentBid.auctionId];
		require(currentAuction.endTime < block.timestamp, 'Auction-not-end');
		uint256 highestBidId = versionHighestBidId[currentBid.auctionId][currentBid.version];
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
		uint256 highestBidId = versionHighestBidId[currentBid.auctionId][currentBid.version];
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

	function migrateNft(address _newContract) public onlyOwner {
		for (uint256 i = 0; i < totalAuctions; i++) {
			Auction memory auction = auctions[i];
			bool isERC721 = IERC721Upgradeable(auction.tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
			if (isERC721 && versionOnAuction[auction.tokenAddress][auction.tokenId][1]) {
				IERC721Upgradeable(auction.tokenAddress).safeTransferFrom(address(this), _newContract, auction.tokenId);
			}
		}
	}

	function migratePayment(address payable _newContract, address _paymentToken) public onlyOwner {
		uint256 _withdrawAmount;
		if (_paymentToken == address(0)) {
			_withdrawAmount = address(this).balance;
			_newContract.transfer(_withdrawAmount);
		} else {
			_withdrawAmount = IERC20Upgradeable(_paymentToken).balanceOf(address(this));
			IERC20Upgradeable(_paymentToken).safeTransfer(_newContract, _withdrawAmount);
		}
	}
}
