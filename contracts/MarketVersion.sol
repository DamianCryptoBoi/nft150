// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './interfaces/IReferral.sol';
import './interfaces/IPOLKANFT.sol';
import './interfaces/IWBNB.sol';
import './interfaces/IPolkaMarketVersion.sol';

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
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import 'hardhat/console.sol';

contract Manager is Ownable, Pausable {
	using SafeERC20 for IERC20;
	address public referralContract;

	// FEE
	//uint256 public xUser = 250; // 2.5%
	// uint256 public xCreator = 1500;
	uint256 public yRefRate = 5000; // 50%
	// uint256 public zProfitToCreator = 5000; // 10% profit

	mapping(address => bool) public paymentMethod;
	mapping(address => bool) public isPOLKANFTs;
	mapping(address => bool) public isFarmingNFTs;
	mapping(address => bool) public isOperator;
	mapping(address => bool) public isRetailer;

	modifier onlyOperator() {
		require(isOperator[msg.sender], 'Only-operator');
		_;
	}

	constructor() {
		isOperator[msg.sender] = true;
		//		oldMarket = _oldMarket;
	}

	receive() external payable {}

	function whiteListOperator(address _operator, bool _whitelist) external onlyOwner {
		isOperator[_operator] = _whitelist;
	}

	function whiteListRetailer(address _retailer, bool _whitelist) external onlyOwner {
		isRetailer[_retailer] = _whitelist;
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unPause() public onlyOwner {
		_unpause();
	}

	function setSystemFee(uint256 _yRefRate) external onlyOwner {
		_setSystemFee(_yRefRate);
	}

	function _setSystemFee(uint256 _yRefRate) internal {
		yRefRate = _yRefRate;
	}

	function addPOLKANFTs(
		address _polkaNFT,
		bool _isPOLKANFT,
		bool _isFarming
	) external onlyOperator returns (bool) {
		isPOLKANFTs[_polkaNFT] = _isPOLKANFT;
		if (_isFarming) {
			isFarmingNFTs[_polkaNFT] = true;
		}
		return true;
	}

	function setReferralContract(address _referralContract) public onlyOwner returns (bool) {
		referralContract = _referralContract;
		return true;
	}

	function setPaymentMethod(address _token, bool _status) public onlyOwner returns (bool) {
		paymentMethod[_token] = _status;
		if (_token != address(0)) {
			IERC20(_token).safeApprove(msg.sender, (2**256 - 1));
			IERC20(_token).safeApprove(address(this), (2**256 - 1));
		}
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
			_withdrawAmount = IERC20(_tokenAddress).balanceOf(address(this));
			IERC20(_tokenAddress).safeTransfer(_beneficiary, _withdrawAmount);
		}
	}
}

contract MarketVersion is Manager, ERC1155Holder, ERC721Holder, ReentrancyGuard {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;
	using Address for address payable;

	//	uint256 public constant ZOOM_POLKA = 10**18;
	uint256 public constant ZOOM_USDT = 10**6;
	uint256 public constant ZOOM_FEE = 10**4;
	uint256 public totalOrders;
	uint256 public totalBids;
	bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
	bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

	struct Order {
		address owner;
		address tokenAddress;
		address paymentToken;
		uint256 tokenId;
		uint256 quantity;
		uint256 price; // price of 1 NFT in paymentToken
		bool isOnsale; // true: on sale, false: cancel
		bool isERC721;
		uint256 fromVersion;
		uint256 toVersion;
	}

	struct Bid {
		address bidder;
		address paymentToken;
		address tokenAddress;
		uint256 tokenId;
		uint256 bidPrice;
		uint256 quantity;
		uint256 expTime;
		bool status; // 1: available | 2: done | 3: reject
		uint256 version;
	}

	mapping(uint256 => Order) public orders;
	mapping(bytes32 => uint256) private orderID;
	mapping(uint256 => Bid) public bids;

	mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public orderIdByVersion;

	//hold: createBid
	mapping(address => uint256) public adminHoldPayment;

	event OrderCreated(
		uint256 _orderId,
		address _tokenAddress,
		uint256 _tokenId,
		uint256 _quantity,
		uint256 _price,
		uint256 _fromVersion,
		uint256 _toVersion
	);
	event Buy(uint256 _itemId, uint256 _quantity, address _paymentToken, uint256 _paymentAmount, uint256 _version);
	event OrderCancelled(uint256 indexed _orderId, uint256 _version);
	event OrderUpdated(uint256 indexed _orderId, uint256 _version);
	event BidCreated(
		uint256 indexed _bidId,
		address _tokenAddress,
		uint256 indexed _tokenId,
		uint256 indexed _quantity,
		uint256 _price,
		address _paymentToken,
		uint256 _version
	);
	event AcceptBid(uint256 indexed _bidId);
	event BidUpdated(uint256 indexed _bidId);
	event BidCancelled(uint256 indexed _bidId);

	constructor() Manager() {}

	function getRefData(address _user) private view returns (address payable) {
		address payable userRef = IReferral(referralContract).getReferral(_user);
		return userRef;
	}

	function _paid(
		address _token,
		address _to,
		uint256 _amount
	) private {
		require(_to != address(0), 'Invalid-address');
		if (_token == address(0)) {
			payable(_to).sendValue(_amount);
		} else {
			IERC20(_token).safeTransfer(_to, _amount);
		}
	}

	function _updateBid(uint256 _bidId, uint256 _quantity) private returns (bool) {
		Bid memory bid = bids[_bidId];
		bid.quantity = bid.quantity.sub(_quantity);
		bid.status = false;
		bids[_bidId] = bid;

		bool isERC721 = IERC721(bid.tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		if (!isERC721) {
			IERC1155(bid.tokenAddress).setNftOwnVersion(bid.tokenId, bid.version, bid.bidder);
			IERC1155(bid.tokenAddress).setNftOnSaleVersion(bid.tokenId, bid.version, false);
		}

		return true;
	}

	function _updateOrder(
		address _buyer,
		address _paymentToken,
		uint256 _orderId,
		uint256 _quantity,
		bytes32 _id,
		uint256 _version
	) private returns (bool) {
		Order memory order = orders[_orderId];
		if (order.isERC721) {
			IERC721(order.tokenAddress).safeTransferFrom(address(this), _buyer, order.tokenId);
		} else {
			IERC1155(order.tokenAddress).safeTransferFrom(
				address(this),
				_buyer,
				order.tokenId,
				_quantity,
				abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'))
			);
			IERC1155(order.tokenAddress).setNftOwnVersion(order.tokenId, _version, _buyer);
			IERC1155(order.tokenAddress).setNftOnSaleVersion(order.tokenId, _version, false);
		}
		order.quantity = order.quantity.sub(_quantity);
		orders[_orderId].quantity = order.quantity;

		return true;
	}

	/**
	 * @dev Matching order mechanism
	 * @param _buyer is address of buyer
	 * @param _orderId is id of order
	 * @param _quantity is total amount to buy
	 * @param _paymentToken is payment method (USDT, ETH, ...)
	 */

	function _match(
		address _buyer,
		address _paymentToken,
		uint256 _orderId,
		uint256 _quantity,
		uint256 orderAmount,
		address payable sellerRef,
		address payable buyerRef,
		uint256 _version
	) private returns (bool) {
		Order memory order = orders[_orderId];
		address payable creator = payable(IPOLKANFT(order.tokenAddress).getCreator(order.tokenId));
		uint256 loyaltyFee = IPOLKANFT(order.tokenAddress).getLoyaltyFee(order.tokenId);
		uint256 nftXUserFee = IPOLKANFT(order.tokenAddress).getXUserFee(order.tokenId);

		if (buyerRef != address(0)) {
			uint256 amountToBuyerRef = orderAmount.mul(nftXUserFee).mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2); // 1.25
			_paid(_paymentToken, buyerRef, amountToBuyerRef);
		}

		if (creator != address(0)) {
			_paid(
				_paymentToken,
				creator,
				orderAmount.mul(loyaltyFee).div(ZOOM_FEE) // take retailFee for retailer
			);
		}

		_paid(_paymentToken, order.owner, orderAmount);

		return
			_updateOrder(
				_buyer,
				_paymentToken,
				_orderId,
				_quantity,
				keccak256(abi.encodePacked(order.tokenAddress, order.tokenId)),
				_version
			);
	}

	/**
	 * @dev Allow user create order on market
	 * @param _tokenAddress is address of NFTs
	 * @param _tokenId is id of NFTs
	 * @param _quantity is total amount for sale
	 * @param _price is price per item in payment method (example 50 USDT)
	 * @param _paymentToken is payment method (USDT, ETH, ...)
	 * @return _orderId uint256 for _orderId
	 */
	function createOrder(
		address _tokenAddress,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _quantity,
		uint256 _price,
		uint256 _fromVersion,
		uint256 _toVersion
	) external whenNotPaused returns (uint256 _orderId) {
		require(_quantity > 0 && (_toVersion - _fromVersion + 1) == _quantity, 'Invalid-quantity');
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');
		bool isERC721 = IERC721(_tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		uint256 balance;

		uint256 _orderId = totalOrders;

		if (isERC721) {
			balance = (IERC721(_tokenAddress).ownerOf(_tokenId) == msg.sender) ? 1 : 0;
			require(balance >= _quantity, 'Insufficient-token-balance');
		} else {
			balance = IERC1155(_tokenAddress).balanceOf(msg.sender, _tokenId);
			require(balance >= _quantity, 'Insufficient-token-balance');
		}

		if (isERC721) {
			IERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
			orderIdByVersion[_tokenAddress][_tokenId][1] = _orderId;
		} else {
			IERC1155(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId, _quantity, '0x');

			for (uint256 i = _fromVersion; i <= _toVersion; i++) {
				IERC1155(_tokenAddress).setNftOwnVersion(_tokenId, i, msg.sender);
				IERC1155(_tokenAddress).setNftOnSaleVersion(_tokenId, i, true);
				orderIdByVersion[_tokenAddress][_tokenId][i] = _orderId;
			}
		}

		Order memory newOrder;
		newOrder.isOnsale = true;
		newOrder.owner = msg.sender;
		newOrder.price = _price;
		newOrder.quantity = _quantity;
		newOrder.tokenId = _tokenId;
		newOrder.isERC721 = isERC721;
		newOrder.tokenAddress = _tokenAddress;
		newOrder.paymentToken = _paymentToken;
		newOrder.fromVersion = _fromVersion;
		newOrder.toVersion = _toVersion;

		orders[_orderId] = newOrder;

		totalOrders = totalOrders.add(1);

		emit OrderCreated(_orderId, _tokenAddress, _tokenId, _quantity, _price, _fromVersion, _toVersion);

		return _orderId;
	}

	function buy(
		uint256 _orderId,
		uint256 _quantity,
		address _paymentToken,
		uint256 _version
	) external payable whenNotPaused returns (bool) {
		Order memory order = orders[_orderId];
		require(order.owner != address(0), 'Invalid-order-id');
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');
		require(_paymentToken == order.paymentToken, 'Payment-token-invalid');
		require(order.isOnsale && order.quantity >= _quantity, 'Not-available-to-buy');

		if (!order.isERC721) {
			require(IERC1155(order.tokenAddress).nftOnSaleVersion(order.tokenId, _version), 'Version-not-on-sale');
			require(
				IERC1155(order.tokenAddress).nftOwnVersion(order.tokenId, _version) == order.owner,
				'Version-not-of-saler'
			);
		}

		uint256 orderAmount = order.price.mul(_quantity);
		uint256 exactPaymentAmount;
		uint256 loyaltyFee = IPOLKANFT(order.tokenAddress).getLoyaltyFee(order.tokenId);
		uint256 nftXUserFee = IPOLKANFT(order.tokenAddress).getXUserFee(order.tokenId);

		exactPaymentAmount = orderAmount.mul(ZOOM_FEE + nftXUserFee + loyaltyFee).div(ZOOM_FEE);

		if (_paymentToken == address(0) && msg.value > 0) {
			require(msg.value >= exactPaymentAmount, 'Payment-value-invalid');
		} else {
			IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), exactPaymentAmount);
		}
		emit Buy(_orderId, _quantity, _paymentToken, exactPaymentAmount, _version);
		return
			_match(
				msg.sender,
				_paymentToken,
				_orderId,
				_quantity,
				orderAmount,
				getRefData(order.owner),
				getRefData(msg.sender),
				_version
			);
	}

	function createBid(
		address _tokenAddress,
		address _paymentToken, // payment method
		uint256 _tokenId,
		uint256 _quantity, // total amount want to buy
		uint256 _price, // price of 1 nft
		uint256 _expTime,
		uint256 _version
	) external payable whenNotPaused returns (uint256 _bidId) {
		require(_quantity > 0, 'Invalid-quantity');
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');

		Bid memory newBid;
		newBid.bidder = msg.sender;
		newBid.bidPrice = _price;
		newBid.quantity = _quantity;
		newBid.tokenId = _tokenId;
		newBid.tokenAddress = _tokenAddress;
		newBid.version = _version;
		if (msg.value > 0) {
			require(msg.value >= _quantity.mul(_price), 'Invalid-amount');
			newBid.paymentToken = address(0);
		} else {
			newBid.paymentToken = _paymentToken;
		}

		if (newBid.paymentToken != address(0)) {
			IERC20(newBid.paymentToken).safeTransferFrom(newBid.bidder, address(this), _quantity.mul(_price));
		}
		adminHoldPayment[_paymentToken] = adminHoldPayment[_paymentToken].add(_quantity.mul(_price));

		newBid.status = true;
		newBid.expTime = _expTime;
		bids[totalBids] = newBid;
		_bidId = totalBids;
		totalBids = totalBids.add(1);
		emit BidCreated(_bidId, _tokenAddress, _tokenId, _quantity, _price, _paymentToken, _version);
		return _bidId;
	}

	function acceptBid(uint256 _bidId, uint256 _quantity) external whenNotPaused returns (bool) {
		Bid memory bid = bids[_bidId];
		uint256 _orderId = orderIdByVersion[bid.tokenAddress][bid.tokenId][bid.version];
		Order memory order = orders[_orderId];
		require(order.owner == msg.sender && order.isOnsale, 'Oops!Wrong-order-owner-or-cancelled');
		require(
			order.quantity >= _quantity && _quantity <= bid.quantity && bid.status,
			'Invalid-quantity-or-bid-cancelled'
		);

		if (!order.isERC721) {
			require(IERC1155(bid.tokenAddress).nftOnSaleVersion(bid.tokenId, bid.version), 'Version-not-on-sale');
			require(
				IERC1155(bid.tokenAddress).nftOwnVersion(bid.tokenId, bid.version) == order.owner,
				'Version-not-of-saler'
			);
		}
		require(bid.paymentToken == order.paymentToken, 'Payment-token-invalid');

		uint256 orderAmount = bid.bidPrice.mul(_quantity);
		uint256 loyaltyFee = IPOLKANFT(order.tokenAddress).getLoyaltyFee(order.tokenId);
		uint256 nftXUserFee = IPOLKANFT(order.tokenAddress).getXUserFee(order.tokenId);

		adminHoldPayment[bid.paymentToken] = adminHoldPayment[bid.paymentToken].sub(orderAmount);

		_match(
			bid.bidder,
			bid.paymentToken,
			_orderId,
			_quantity,
			orderAmount.mul(ZOOM_FEE).div(ZOOM_FEE.add(nftXUserFee).add(loyaltyFee)),
			getRefData(msg.sender),
			getRefData(bid.bidder),
			bid.version
		);
		emit AcceptBid(_bidId);
		return _updateBid(_bidId, _quantity);
	}

	function cancelOrder(uint256 _orderId, uint256 _version) external whenNotPaused {
		Order memory order = orders[_orderId];
		require(order.owner == msg.sender && order.isOnsale, 'Oops!Wrong-order-owner-or-cancelled');

		if (order.isERC721) {
			IERC721(order.tokenAddress).safeTransferFrom(address(this), order.owner, order.tokenId);
			order.isOnsale = false;
			order.quantity = 0;
		} else {
			require(IERC1155(order.tokenAddress).nftOnSaleVersion(order.tokenId, _version), 'Version-not-on-sale');
			IERC1155(order.tokenAddress).safeTransferFrom(
				address(this),
				order.owner,
				order.tokenId,
				1,
				abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'))
			);
			order.quantity = order.quantity - 1;
		}

		orders[_orderId] = order;

		if (!order.isERC721 && IERC1155(order.tokenAddress).nftOwnVersion(order.tokenId, _version) == msg.sender) {
			IERC1155(order.tokenAddress).setNftOnSaleVersion(order.tokenId, _version, false);
		}

		emit OrderCancelled(_orderId, _version);
	}

	function cancelBid(uint256 _bidId) external whenNotPaused nonReentrant {
		Bid memory bid = bids[_bidId];
		require(bid.bidder == msg.sender && bid.status, 'Invalid-bidder');
		if (bid.paymentToken == address(0)) {
			uint256 payBackAmount = bid.quantity.mul(bid.bidPrice);
			payable(msg.sender).sendValue(payBackAmount);
		} else {
			IERC20(bid.paymentToken).safeTransferFrom(address(this), bid.bidder, bid.quantity.mul(bid.bidPrice));
		}

		adminHoldPayment[bid.paymentToken] = adminHoldPayment[bid.paymentToken].sub(bid.quantity.mul(bid.bidPrice));

		bid.status = false;
		bid.quantity = 0;
		bids[_bidId] = bid;
		emit BidCancelled(_bidId);
	}

	function adminMigrateOrders(
		address oldMarket,
		uint256 startId,
		uint256 endId
	) external onlyOwner {
		totalOrders = IPolkaMarketVersion(oldMarket).totalOrders();

		require(startId < totalOrders, 'StartId-more-than-maxid');
		if (endId > totalOrders - 1) {
			endId = totalOrders - 1;
		}
		for (uint256 i = startId; i <= endId; i++) {
			(
				address owner,
				address tokenAddress,
				address paymentToken,
				uint256 tokenId,
				uint256 quantity,
				uint256 price,
				bool isOnsale,
				bool isERC721,
				uint256 fromVersion,
				uint256 toVersion
			) = IPolkaMarketVersion(oldMarket).orders(i);
			if (quantity > 0) {
				Order memory newOrder;
				newOrder.isOnsale = isOnsale;
				newOrder.isERC721 = isERC721;
				newOrder.owner = owner;
				newOrder.price = price;
				newOrder.quantity = quantity;
				newOrder.tokenId = tokenId;
				newOrder.tokenAddress = tokenAddress;
				newOrder.paymentToken = paymentToken;
				newOrder.fromVersion = fromVersion;
				newOrder.toVersion = toVersion;
				orders[i] = newOrder;

				for (uint256 j = fromVersion; j <= toVersion; j++) {
					orderIdByVersion[tokenAddress][tokenId][j] = IPolkaMarketVersion(oldMarket).orderIdByVersion(
						tokenAddress,
						tokenId,
						j
					);
				}
			}
		}
	}

	function adminMigratePushNFT(
		address newMarket,
		uint256 startId,
		uint256 endId
	) external onlyOwner {
		//totalOrders = IPolkaMarket(oldMarket).totalOrders();
		require(startId < totalOrders, 'StartId-more-than-maxid');
		if (endId > totalOrders - 1) {
			endId = totalOrders - 1;
		}
		for (uint256 i = startId; i <= endId; i++) {
			Order memory order = orders[i];

			if (order.quantity > 0) {
				if (order.isERC721) {
					if (IERC721(order.tokenAddress).ownerOf(order.tokenId) == address(this)) {
						IERC721(order.tokenAddress).safeTransferFrom(address(this), newMarket, order.tokenId);
					}
				} else {
					uint256 quantityOf = IERC1155(order.tokenAddress).balanceOf(address(this), order.tokenId);
					if (quantityOf > 0) {
						IERC1155(order.tokenAddress).safeTransferFrom(
							address(this),
							newMarket,
							order.tokenId,
							quantityOf,
							abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'))
						);
					}
				}
			}
		}
	}

	function adminMigrateBids(
		address oldMarket,
		uint256 startId,
		uint256 endId
	) external onlyOwner {
		totalBids = IPolkaMarketVersion(oldMarket).totalBids();

		require(startId < totalBids, 'StartId-more-than-maxid');
		if (endId > totalBids - 1) {
			endId = totalBids - 1;
		}

		for (uint256 j = startId; j <= endId; j++) {
			(
				address bidder,
				address paymentToken,
				address tokenAddress,
				uint256 tokenId,
				uint256 bidPrice,
				uint256 quantity,
				uint256 expTime,
				bool status,
				uint256 version
			) = IPolkaMarketVersion(oldMarket).bids(j);
			if (quantity > 0) {
				Bid memory newBid;
				newBid.bidder = bidder;
				newBid.paymentToken = paymentToken;
				newBid.tokenAddress = tokenAddress;
				newBid.tokenId = tokenId;
				newBid.bidPrice = bidPrice;
				newBid.quantity = quantity;
				newBid.expTime = expTime;
				newBid.status = status;
				newBid.version = version;
				bids[j] = newBid;

				if (status) {
					adminHoldPayment[paymentToken] = adminHoldPayment[paymentToken].add(quantity.mul(bidPrice));
				}
			}
		}
	}

	function sendPaymentToNewContract(address _token, address _newContract) external onlyOwner {
		require(_newContract != address(0), 'Invalid-address');
		if (_token == address(0)) {
			payable(_newContract).sendValue(adminHoldPayment[_token]);
		} else {
			IERC20(_token).safeTransfer(_newContract, adminHoldPayment[_token]);
		}
	}

	function setApproveForAll(address _token, address _spender) external onlyOwner {
		IERC1155(_token).setApprovalForAll(_spender, true);
	}

	function setApproveForAllERC721(address _token, address _spender) external onlyOwner {
		IERC721(_token).setApprovalForAll(_spender, true);
	}
}
