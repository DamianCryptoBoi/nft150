// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './interfaces/IReferral.sol';
import './interfaces/IPOLKANFT.sol';
import './interfaces/IPolkaMarket.sol';

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

contract ManagerAuction is Ownable, Pausable {
	address public referralContract;
	using SafeMath for uint256;
	using SafeERC20 for IERC20;
	using Address for address payable;

	uint256 public yRefRate = 5000; // 50%

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
		bool status; // true: open | false: closed
	}

	struct BidAuction {
		address bidder;
		address paymentToken;
		address tokenAddress;
		uint256 tokenId;
		uint256 auctionId;
		uint256 bidPrice;
		bool status;
		uint256 version;
	}

	mapping(uint256 => Auction) public auctions;
	mapping(uint256 => BidAuction) public bidAuctions;

	//hold: createBid
	mapping(address => uint256) public adminHoldPayment;

	mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public auctionIdByVersion;

	mapping(uint256 => mapping(address => bool)) public userJoinAuction;

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
	event BidAuctionEdited(uint256 indexed _bidAuctionId, uint256 _price);
	event AuctionCanceled(uint256 indexed _auctionId);
	event BidAuctionCanceled(uint256 indexed _bidAuctionId);
	event BidAuctionAccepted(uint256 indexed _bidAuctionId);
	event BidAuctionClaimed(uint256 indexed _bidAuctionId);

	constructor() {}

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
			IERC20(_token).approve(msg.sender, (2**256 - 1));
			IERC20(_token).approve(address(this), (2**256 - 1));
		}
		return true;
	}

	function getAuctionIdByVersion(
		address _tokenAddress,
		uint256 _tokenId,
		uint256 _version
	) public view returns (uint256) {
		return auctionIdByVersion[_tokenAddress][_tokenId][_version];
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
			IERC20(_token).safeTransfer(_to, _amount);
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

		if (creator != address(0)) {
			_paid(_paymentToken, creator, _bidPrice.mul(loyaltyFee).div(ZOOM_FEE));
		}

		_paid(_paymentToken, aut.owner, _bidPrice - _bidPrice.mul(loyaltyFee + nftXUserFee).div(ZOOM_FEE));
	}

	function _transferBidAuction(uint256 _bidAuctionId) internal {
		BidAuction storage bidAuction = bidAuctions[_bidAuctionId];
		Auction storage aut = auctions[bidAuctions[_bidAuctionId].auctionId];
		bidAuction.status = false;
		aut.status = false;

		bool isERC721 = IERC721(bidAuction.tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		if (!isERC721) {
			IERC1155(bidAuction.tokenAddress).setNftOwnVersion(
				bidAuction.tokenId,
				bidAuction.version,
				bidAuction.bidder
			);
			IERC1155(bidAuction.tokenAddress).setNftOnSaleVersion(bidAuction.tokenId, bidAuction.version, false);
		}
	}

	function _getRefData(address _user) internal view returns (address payable) {
		address payable userRef = IReferral(referralContract).getReferral(_user);
		return userRef;
	}
}

contract AuctionV3 is ManagerAuction, ERC1155Holder, ERC721Holder {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;
	using Address for address payable;

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

		bool isERC721 = IERC721(_tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);

		uint256 balance = isERC721
			? ((IERC721(_tokenAddress).ownerOf(_tokenId) == msg.sender) ? 1 : 0)
			: IERC1155(_tokenAddress).balanceOf(msg.sender, _tokenId);
		require(balance >= (_toVersion - _fromVersion + 1), 'Insufficient-token-balance');

		_auctionId = totalAuctions;

		if (isERC721) {
			auctionIdByVersion[_tokenAddress][_tokenId][1] = _auctionId;
			IERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
		} else {
			for (uint256 i = _fromVersion; i <= _toVersion; i++) {
				require(!IERC1155(_tokenAddress).nftOnSaleVersion(_tokenId, i), 'Version-on-sale');
				require(IERC1155(_tokenAddress).nftOwnVersion(_tokenId, i) == msg.sender, 'Version-not-of-sender');
				require(!auctions[getAuctionIdByVersion(_tokenAddress, _tokenId, i)].status, 'Version-on-auction');
				auctionIdByVersion[_tokenAddress][_tokenId][i] = _auctionId;
			}
			IERC1155(_tokenAddress).safeTransferFrom(
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
		newAuction.status = true;

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
		require(auctions[_auctionId].paymentToken == _paymentToken, 'incorrect-payment-method');
		require(auctions[_auctionId].owner != msg.sender, 'owner-can-not-bid');

		Auction storage currentAuction = auctions[_auctionId];

		require(currentAuction.status, 'Auction-closed');
		require(block.timestamp >= currentAuction.startTime, 'not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'not-in-time-auction');
		require(!userJoinAuction[_auctionId][msg.sender], 'user-joined-auction');
		require(
			currentAuction.listBidId.length == 0 ||
				bidAuctions[currentAuction.listBidId[currentAuction.listBidId.length - 1]].bidPrice < _price,
			'price-bid-less-than-max-price'
		);

		userJoinAuction[_auctionId][msg.sender] = true;

		BidAuction memory newBidAuction;
		newBidAuction.bidder = msg.sender;
		newBidAuction.bidPrice = _price;
		newBidAuction.tokenId = _tokenId;
		newBidAuction.auctionId = _auctionId;
		newBidAuction.tokenAddress = _tokenAddress;
		newBidAuction.version = _version;
		newBidAuction.status = true;

		if (msg.value > 0) {
			require(msg.value >= _price, 'Invalid-amount');
			newBidAuction.paymentToken = address(0);
		} else {
			newBidAuction.paymentToken = _paymentToken;
		}

		if (newBidAuction.paymentToken != address(0)) {
			IERC20(newBidAuction.paymentToken).safeTransferFrom(newBidAuction.bidder, address(this), _price);
		}

		adminHoldPayment[_paymentToken] = adminHoldPayment[_paymentToken].add(_price);

		bidAuctions[totalBidAuctions] = newBidAuction;
		_bidAuctionId = totalBidAuctions;

		currentAuction.listBidId.push(_bidAuctionId);

		totalBidAuctions++;

		emit BidAuctionCreated(_bidAuctionId, _tokenAddress, _tokenId, _price, _paymentToken, _version);

		return _bidAuctionId;
	}

	function editBidAuction(uint256 _bidAuctionId, uint256 _price) external payable whenNotPaused returns (uint256) {
		BidAuction storage objEditBidAuction = bidAuctions[_bidAuctionId];
		Auction storage currentAuction = auctions[objEditBidAuction.auctionId];

		require(currentAuction.status, 'Auction-closed');
		require(msg.sender == objEditBidAuction.bidder, 'Not-owner-bid-auction');
		require(block.timestamp >= currentAuction.startTime, 'not-in-time-auction');
		require(block.timestamp <= currentAuction.endTime, 'not-in-time-auction');
		require(
			bidAuctions[currentAuction.listBidId[currentAuction.listBidId.length - 1]].bidPrice < _price,
			'price-bid-less-than-max-price'
		);

		if (msg.value > 0) {
			require(msg.value >= _price - objEditBidAuction.bidPrice, 'Invalid-amount');
		}

		if (objEditBidAuction.paymentToken != address(0)) {
			IERC20(objEditBidAuction.paymentToken).safeTransferFrom(
				objEditBidAuction.bidder,
				address(this),
				_price - objEditBidAuction.bidPrice
			);
		}
		adminHoldPayment[objEditBidAuction.paymentToken] = adminHoldPayment[objEditBidAuction.paymentToken].add(
			_price - objEditBidAuction.bidPrice
		);

		objEditBidAuction.status = false;

		bidAuctions[totalBidAuctions] = objEditBidAuction;
		bidAuctions[totalBidAuctions].status = true;
		bidAuctions[totalBidAuctions].bidPrice = _price;

		currentAuction.listBidId.push(totalBidAuctions);

		totalBidAuctions++;

		emit BidAuctionEdited(_bidAuctionId, _price);

		return _bidAuctionId;
	}

	function cancelAuction(
        uint256 _auctionId
        ) external whenNotPaused() returns (uint256) {

        require(block.timestamp < auctions[_auctionId].startTime, 'auction-started');
        require(auctions[_auctionId].status, 'Auction-closed');
        require(auctions[_auctionId].owner == msg.sender, 'Auction-not-owner');

        bool isERC721 = IERC721(auctions[_auctionId].tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
        Auction storage auctionObj = auctions[_auctionId];

        if (isERC721) {
            IERC721(auctionObj.tokenAddress).safeTransferFrom(address(this), msg.sender, auctionObj.tokenId);
            
        } else {
            IERC1155(auctionObj.tokenAddress).safeTransferFrom(address(this), msg.sender, auctionObj.tokenId, auctionObj.toVersion - auctionObj.fromVersion + 1, '0x');
        }

        auctions[_auctionId].status =  false;

        emit AuctionCanceled(_auctionId);
        return _auctionId;
    }

	function cancelBidAuction(uint256 _bidAuctionId) external whenNotPaused returns (uint256) {
		require(bidAuctions[_bidAuctionId].status, 'Bid-closed');
		require(msg.sender == bidAuctions[_bidAuctionId].bidder, 'Not-owner-bid-auction');
		Auction memory currentAuction = auctions[bidAuctions[_bidAuctionId].auctionId];

		require(
			bidAuctions[currentAuction.listBidId[currentAuction.listBidId.length - 1]].bidPrice >
				bidAuctions[_bidAuctionId].bidPrice,
			'price-bid-less-than-max-price'
		); // the last bid price > this bid price

		userJoinAuction[bidAuctions[_bidAuctionId].auctionId][msg.sender] = false;

		bidAuctions[_bidAuctionId].status = false;
		if (bidAuctions[_bidAuctionId].paymentToken == address(0)) {
			payable(bidAuctions[_bidAuctionId].bidder).sendValue(bidAuctions[_bidAuctionId].bidPrice);
		} else {
			IERC20(bidAuctions[_bidAuctionId].paymentToken).safeTransferFrom(
				address(this),
				bidAuctions[_bidAuctionId].bidder,
				bidAuctions[_bidAuctionId].bidPrice
			);
		}

		emit BidAuctionCanceled(_bidAuctionId);

		return _bidAuctionId;
	}

	function acceptBidAuction(uint256 _bidAuctionId) external whenNotPaused {
		require(auctions[bidAuctions[_bidAuctionId].auctionId].endTime < block.timestamp, 'Auction-not-end');
		require(auctions[bidAuctions[_bidAuctionId].auctionId].owner == msg.sender, 'Auction-not-owner');
		Auction memory currentAuction = auctions[bidAuctions[_bidAuctionId].auctionId];
		require(bidAuctions[_bidAuctionId].bidPrice >= currentAuction.reservePrice, 'reserve-price-not-met');
		_payBidAuction(_bidAuctionId);

		emit BidAuctionAccepted(_bidAuctionId);
	}

	function claimWinnerAuction(uint256 _bidAuctionId) external whenNotPaused {
		require(auctions[bidAuctions[_bidAuctionId].auctionId].endTime < block.timestamp, 'Auction-not-end');
		Auction memory currentAuction = auctions[bidAuctions[_bidAuctionId].auctionId];
		address winner = bidAuctions[currentAuction.listBidId[currentAuction.listBidId.length - 1]].bidder;
		require(msg.sender == winner, 'not-winner'); // make sure the sender is the winner
		require(bidAuctions[_bidAuctionId].bidPrice >= currentAuction.reservePrice, 'reserve-price-not-met');
		_transferBidAuction(_bidAuctionId);

		emit BidAuctionClaimed(_bidAuctionId);
	}
}
