// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import './ERC1155Holder.sol';
import './interfaces/IReferral.sol';
import './interfaces/ISotaExchange.sol';
import './interfaces/ISOTANFT.sol';
import './interfaces/IWBNB.sol';
import './interfaces/IProfitEstimator.sol';
import './interfaces/ISotaMarket.sol';

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract Manager is Ownable, Pausable {
	address public immutable oldMarket;
	address public sota;
	address public WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;
	address public referralContract;
	address public sotaExchangeContract;
	address public profitEstimatorContract;

	// FEE
	uint256 public xUser = 250; // 2.5%
	uint256 public xCreator = 1500;
	uint256 public yRefRate = 5000; // 50%
	uint256 public zProfitToCreator = 5000; // 10% profit
	uint256 public discountForBuyer = 50;
	uint256 public discountForSota = 100; // discount for user who made payment in sota
	mapping(address => bool) public paymentMethod;
	mapping(address => bool) public isSOTANFTs;
	mapping(address => bool) public isFarmingNFTs;
	mapping(address => bool) public isOperator;
	mapping(address => bool) public isRetailer;

	modifier onlyOperator() {
		require(isOperator[msg.sender], 'Only-operator');
		_;
	}

	constructor(address _oldMarket) {
		isOperator[msg.sender] = true;
		oldMarket = _oldMarket;
	}

	function whiteListOperator(address _operator, bool _whitelist) external onlyOwner() {
		isOperator[_operator] = _whitelist;
	}

	function whiteListRetailer(address _retailer, bool _whitelist) external onlyOwner() {
		isRetailer[_retailer] = _whitelist;
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unPause() public onlyOwner {
		_unpause();
	}

	function setSystemFee(
		uint256 _xUser,
		uint256 _xCreator,
		uint256 _yRefRate,
		uint256 _zProfitToCreator,
		uint256 _discountForBuyer,
		uint256 _discountForSota
	) external onlyOwner {
		_setSystemFee(_xUser, _xCreator, _yRefRate, _zProfitToCreator, _discountForBuyer, _discountForSota);
	}

	function _setSystemFee(
		uint256 _xUser,
		uint256 _xCreator,
		uint256 _yRefRate,
		uint256 _zProfitToCreator,
		uint256 _discountForBuyer,
		uint256 _discountForSota
	) internal {
		xUser = _xUser;
		xCreator = _xCreator;
		yRefRate = _yRefRate;
		zProfitToCreator = _zProfitToCreator;
		discountForBuyer = _discountForBuyer;
		discountForSota = _discountForSota;
	}

	function setSotaContract(address _sota) public onlyOwner returns (bool) {
		sota = _sota;
		return true;
	}

	function addSOTANFTs(
		address _sotaNFT,
		bool _isSOTANFT,
		bool _isFarming
	) external onlyOperator() returns (bool) {
		isSOTANFTs[_sotaNFT] = _isSOTANFT;
		if (_isFarming) {
			isFarmingNFTs[_sotaNFT] = true;
		}
		return true;
	}

	function setReferralContract(address _referralContract) public onlyOwner returns (bool) {
		referralContract = _referralContract;
		return true;
	}

	function setSotaExchangeContract(address _sotaExchangeContract) public onlyOwner returns (bool) {
		sotaExchangeContract = _sotaExchangeContract;
		return true;
	}

	function setProfitSenderContract(address _profitEstimatorContract) public onlyOwner returns (bool) {
		profitEstimatorContract = _profitEstimatorContract;
		return true;
	}

	function setPaymentMethod(address _token, bool _status) public onlyOwner returns (bool) {
		paymentMethod[_token] = _status;
		if (_token != address(0)) {
			IERC20(_token).approve(msg.sender, (2**256 - 1));
			IERC20(_token).approve(address(this), (2**256 - 1));


		}
		return true;
	}

	/**
	 * @notice withdrawFunds
	 */
	function withdrawFunds(address payable _beneficiary, address _tokenAddress) external onlyOwner() whenPaused() {
		uint256 _withdrawAmount;
		if (_tokenAddress == address(0)) {
			_beneficiary.transfer(address(this).balance);
			_withdrawAmount = address(this).balance;
		} else {
			_withdrawAmount = IERC20(_tokenAddress).balanceOf(address(this));
			IERC20(_tokenAddress).transfer(_beneficiary, _withdrawAmount);
		}
	}
}

contract Market is Manager, ERC1155Holder, ERC721Holder, ReentrancyGuard {
	using SafeMath for uint256;


	uint256 public constant ZOOM_SOTA = 10**18;
	uint256 public constant ZOOM_USDT = 10**6;
	uint256 public constant ZOOM_FEE = 10**4;
	uint256 public totalOrders;
	uint256 public totalBids;
	bytes4 public constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
	bytes4 public constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

	struct Order {
		address owner;
		address tokenAddress;
		address paymentToken;
		address retailer;
		uint256 tokenId;
		uint256 quantity;
		uint256 price; // price of 1 NFT in paymentToken
		uint256 retailFee;
		bool isOnsale; // true: on sale, false: cancel
		bool isERC721;
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
	}

	mapping(uint256 => Order) public orders;
	mapping(bytes32 => uint256) public orderID;
	mapping(uint256 => Bid) public bids;
	mapping(address => mapping(bytes32 => uint256)) lastBuyPriceInUSDT; // lastbuy price of NFT with id = keccak256(address, id) from user in USD
	mapping(address => mapping(uint256 => uint256)) public amountFirstSale;
	mapping(address => mapping(bytes32 => uint256)) public farmingAmount;


constructor(address _oldMarket) Manager(_oldMarket) {}

	event OrderCreated(uint256 indexed _orderId, address _tokenAddress, uint256 indexed _tokenId, uint256 indexed _quantity, uint256 _price, address _paymentToken);
	event Buy(uint256 _itemId, uint256 _quantity, address _paymentToken, uint256 _paymentAmount);
	event OrderCancelled(uint256 indexed _orderId);
	event OrderUpdated(uint256 indexed _orderId);
	event BidCreated(uint256 indexed _bidId, address _tokenAddress, uint256 indexed _tokenId, uint256 indexed _quantity, uint256 _price, address _paymentToken);
	event AcceptBid(uint256 indexed _bidId);
	event BidUpdated(uint256 indexed _bidId);
	event BidCancelled(uint256 indexed _bidId);

	modifier validAmount(
		uint256 _orderId,
		uint256 _quantity,
		uint256 _paymentAmount,
		address _paymentToken
	) {
		require(_validAmount(_orderId, _quantity, _paymentAmount, _paymentToken));
		_;
	}
function _validAmount(
		uint256 _orderId,
		uint256 _quantity,
		uint256 _paymentAmount,
		address _paymentToken
	) private returns (bool) {
		Order memory order = orders[_orderId];

		uint256 buyAmount = (_paymentToken == order.paymentToken) ? order.price.mul(_quantity) : estimateToken(_paymentToken, order.price.mul(_quantity)); // total purchase amount for quantity*price
		return (_paymentAmount >= buyAmount.mul(ZOOM_FEE + xUser).div(ZOOM_FEE)) ? true : false; //102.5%
	}

	 	function getRefData(address _user) internal view returns (address payable) {
		address payable userRef = IReferral(referralContract).getReferral(_user);
		return userRef;
	}

	function estimateUSDT(address _paymentToken, uint256 _paymentAmount) internal view returns (uint256) {
		return ISotaExchange(sotaExchangeContract).estimateToUSDT(_paymentToken, _paymentAmount);
	}

	function estimateToken(address _paymentToken, uint256 _usdtAmount) internal view returns (uint256) {
		return ISotaExchange(sotaExchangeContract).estimateFromUSDT(_paymentToken, _usdtAmount);
	}
}

contract SotaMarketV2 is Market {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;
	using Address for address payable;




	constructor(address _oldMarket) Market(_oldMarket) {}





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
		bids[_bidId] = bid;
		return true;
	}

	function _updateOrder(
		address _buyer,
		address _paymentToken,
		uint256 _orderId,
		uint256 _quantity,
		uint256 _price,
		bytes32 _id
	) private returns (bool) {
		Order memory order = orders[_orderId];
		if (order.isERC721) {
			IERC721(order.tokenAddress).safeTransferFrom(address(this), _buyer, order.tokenId);
		} else {
			IERC1155(order.tokenAddress).safeTransferFrom(address(this), _buyer, order.tokenId, _quantity, abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)')));
		}
		order.quantity = order.quantity.sub(_quantity);
		orders[_orderId].quantity = order.quantity;
		lastBuyPriceInUSDT[_buyer][_id] = estimateUSDT(_paymentToken, _price);
		return true;
	}

	/**
	 * @dev Matching order mechanism
	 * @param _buyer is address of buyer
	 * @param _orderId is id of order
	 * @param _quantity is total amount to buy
	 * @param _paymentToken is payment method (USDT, SOTA, BNB, ...)
	 * @param _price is matched price
	 */

	function _match(
		address _buyer,
		address _paymentToken,
		uint256 _orderId,
		uint256 _quantity,
		uint256 _price,
		uint256 orderAmount,
		address payable sellerRef,
		address payable buyerRef
	) private returns (bool) {
		Order memory order = orders[_orderId];
		uint256 amountToSeller = orderAmount; //
		if (buyerRef != address(0)) {
			uint256 amountToBuyerRef = orderAmount.mul(xUser).mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2); // 1.25
			_paid(_paymentToken, buyerRef, amountToBuyerRef);
			if (discountForBuyer > 0) {
				// discount for buyer that have ref
				_paid(_paymentToken, _buyer, orderAmount.mul(discountForBuyer).div(ZOOM_FEE));
			}
		}

		if (order.retailer != address(0)) {
			_paid(
				_paymentToken,
				order.retailer,
				orderAmount.mul(order.retailFee).div(ZOOM_FEE) // take retailFee for retailer
			);
			amountToSeller = amountToSeller.sub(orderAmount.mul(order.retailFee).div(ZOOM_FEE));
		}

		if (isSOTANFTs[order.tokenAddress]) {
			address payable creator = payable(ISOTANFT(order.tokenAddress).getCreator(order.tokenId));
			if (amountFirstSale[order.tokenAddress][order.tokenId] > 0 && (creator == order.owner)) {
				if (sellerRef != address(0)) {
					{
						uint256 amountToSellferRef;
						if (amountFirstSale[order.tokenAddress][order.tokenId] >= _quantity) {
							amountToSellferRef = orderAmount.mul(xCreator).mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2); // take 15%*50% fee
							amountToSeller = amountToSeller.sub(orderAmount.mul(xCreator).div(ZOOM_FEE)); // take 15% fee
							amountFirstSale[order.tokenAddress][order.tokenId] = amountFirstSale[order.tokenAddress][order.tokenId].sub(_quantity);
						} else {
							{
								uint256 a = amountFirstSale[order.tokenAddress][order.tokenId].mul(_price).mul(xCreator);
								amountToSeller = amountToSeller.sub(a.div(ZOOM_FEE));
								a = a.mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2);
								amountToSellferRef = a;
								a = _quantity - amountFirstSale[order.tokenAddress][order.tokenId];
								a = a.mul(_price).mul(xUser);
								amountToSeller = amountToSeller.sub(a.div(ZOOM_FEE));
								a = a.mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2);
								amountToSellferRef = amountToSellferRef.add(a);
							}
						}
						_paid(_paymentToken, sellerRef, amountToSellferRef);
					}
				} else {
					if (amountFirstSale[order.tokenAddress][order.tokenId] >= _quantity) {
						amountToSeller = amountToSeller.sub(orderAmount.mul(xCreator).div(ZOOM_FEE));
						amountFirstSale[order.tokenAddress][order.tokenId] = amountFirstSale[order.tokenAddress][order.tokenId].sub(_quantity);
					} else {
						uint256 b = amountFirstSale[order.tokenAddress][order.tokenId].mul(_price).mul(xCreator).div(ZOOM_FEE);
						amountToSeller = amountToSeller.sub(b);
						b = _quantity - amountFirstSale[order.tokenAddress][order.tokenId];
						b = b.mul(_price).mul(xUser).div(ZOOM_FEE);
						amountToSeller = amountToSeller.sub(b);
					}
				}
				_paid(_paymentToken, order.owner, amountToSeller);
			} else {
				if (isFarmingNFTs[order.tokenAddress] && (order.owner != creator) && farmingAmount[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))] > 0) {
					uint256 a = farmingAmount[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))];
					if (a >= _quantity) {
						_paid(_paymentToken, creator, orderAmount.mul(zProfitToCreator).div(ZOOM_FEE));
						amountToSeller = amountToSeller.sub(orderAmount.mul(ZOOM_FEE - zProfitToCreator).div(ZOOM_FEE));
						_paid(_paymentToken, order.owner, amountToSeller);
						farmingAmount[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))] = a.sub(_quantity);
					} else {
						{
							uint256 amountToCreator = a.mul(_price).mul(zProfitToCreator).div(ZOOM_FEE);
							amountToSeller = amountToSeller.sub(amountToCreator);
							a = _quantity.sub(a);
							amountToCreator =
								amountToCreator +
								IProfitEstimator(profitEstimatorContract).profitToCreator(
									order.tokenAddress,
									_paymentToken,
									order.tokenId,
									a,
									_price,
									lastBuyPriceInUSDT[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))]
								);
							_paid(_paymentToken, creator, amountToCreator);
							_paid(_paymentToken, order.owner, amountToSeller.sub(amountToCreator));
							farmingAmount[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))] = 0;
						}
					}
				} else {
					amountToSeller = amountToSeller.sub(orderAmount.mul(xUser).div(ZOOM_FEE));
					if (sellerRef != address(0)) {
						_paid(_paymentToken, sellerRef, orderAmount.mul(xUser).mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2));
					}

					if (order.owner == creator) {
						_paid(_paymentToken, order.owner, amountToSeller);
					} else {
						uint256 amountToCreator =
							IProfitEstimator(profitEstimatorContract).profitToCreator(
								order.tokenAddress,
								_paymentToken,
								order.tokenId,
								_quantity,
								_price,
								lastBuyPriceInUSDT[order.owner][keccak256(abi.encodePacked(order.tokenAddress, order.tokenId))]
							);
						if (amountToCreator > 0) {
							_paid(_paymentToken, creator, amountToCreator);
						}
						_paid(_paymentToken, order.owner, amountToSeller.sub(amountToCreator));
					}
				}
			}
		} else {
			amountToSeller = amountToSeller.sub(orderAmount.mul(xUser).div(ZOOM_FEE));
			if (sellerRef != address(0)) {
				_paid(_paymentToken, sellerRef, orderAmount.mul(xUser).mul(ZOOM_FEE - yRefRate).div(ZOOM_FEE**2));
			}
			_paid(_paymentToken, order.owner, amountToSeller);
		}

		return _updateOrder(_buyer, _paymentToken, _orderId, _quantity, _price, keccak256(abi.encodePacked(order.tokenAddress, order.tokenId)));
	}

	/**
	 * @dev Allow user create order on market
	 * @param _tokenAddress is address of NFTs
	 * @param _tokenId is id of NFTs
	 * @param _quantity is total amount for sale
	 * @param _price is price per item in payment method (example 50 USDT)
	 * @param _paymentToken is payment method (USDT, SOTA, BNB, ...)
	 */
	function createOrder(
		address _tokenAddress,
		address _retailer,
		address _paymentToken, // payment method
		uint256 _tokenId,
		uint256 _quantity, // total amount for sale
		uint256 _price, // price of 1 nft
		uint256 _retailFee
	) external whenNotPaused() returns (uint256 _orderId) {
		require(_quantity > 0, 'Invalid-quantity');
		bool isERC721 = IERC721(_tokenAddress).supportsInterface(_INTERFACE_ID_ERC721);
		uint256 balance;
		if (isERC721) {
			balance = (IERC721(_tokenAddress).ownerOf(_tokenId) == msg.sender) ? 1 : 0;
			require(balance >= _quantity, 'Insufficient-token-balance');
			IERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
		} else {
			balance = IERC1155(_tokenAddress).balanceOf(msg.sender, _tokenId);
			require(balance >= _quantity, 'Insufficient-token-balance');
			IERC1155(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId, _quantity, '0x');
		}
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');
		Order memory newOrder;
		newOrder.isOnsale = true;
		newOrder.owner = msg.sender;
		newOrder.price = _price;
		newOrder.quantity = _quantity;
		if (isRetailer[_retailer]) {
			newOrder.retailer = _retailer;
			newOrder.retailFee = _retailFee;
		}
		newOrder.tokenId = _tokenId;
		newOrder.isERC721 = isERC721;
		newOrder.tokenAddress = _tokenAddress;
		newOrder.paymentToken = _paymentToken;
		if (
			isSOTANFTs[_tokenAddress] &&
			ISOTANFT(_tokenAddress).getCreator(_tokenId) == msg.sender &&
			amountFirstSale[_tokenAddress][_tokenId] == 0 &&
			lastBuyPriceInUSDT[msg.sender][keccak256(abi.encodePacked(_tokenAddress, _tokenId))] == 0
		) {
			amountFirstSale[_tokenAddress][_tokenId] = balance;
		}
		if (
			isFarmingNFTs[_tokenAddress] && (msg.sender != ISOTANFT(_tokenAddress).getCreator(_tokenId)) && (lastBuyPriceInUSDT[msg.sender][keccak256(abi.encodePacked(_tokenAddress, _tokenId))] == 0)
		) {
			farmingAmount[msg.sender][keccak256(abi.encodePacked(_tokenAddress, _tokenId))] = balance;
		}
		orders[totalOrders] = newOrder;
		_orderId = totalOrders;
		totalOrders = totalOrders.add(1);
		emit OrderCreated(_orderId, _tokenAddress, _tokenId, _quantity, _price, _paymentToken);
		bytes32 _id = keccak256(abi.encodePacked(_tokenAddress, _tokenId, msg.sender));
		orderID[_id] = _orderId;
		return _orderId;
	}

	function buy(
		uint256 _orderId,
		uint256 _quantity,
		address _paymentToken
	) external payable whenNotPaused() returns (bool) {
		Order memory order = orders[_orderId];
		require(order.owner != address(0), 'Invalid-order-id');
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');
		require(order.isOnsale && order.quantity >= _quantity, 'Not-available-to-buy');
		uint256 orderAmount = order.price.mul(_quantity);
		uint256 exactPaymentAmount;
		if (_paymentToken == order.paymentToken) {
			exactPaymentAmount = orderAmount.mul(ZOOM_FEE + xUser).div(ZOOM_FEE);
		} else {
			orderAmount = estimateToken(_paymentToken, orderAmount);
			exactPaymentAmount = orderAmount.mul(ZOOM_FEE + xUser).div(ZOOM_FEE);
		}
		// uint256 exactPaymentAmount =
		// 	(_paymentToken == order.paymentToken) ? orderAmount.mul(ZOOM_FEE + xUser).div(ZOOM_FEE) : estimateToken(_paymentToken, orderAmount).mul(ZOOM_FEE + xUser).div(ZOOM_FEE); // 1.025
		if (_paymentToken == sota && discountForSota > 0) {
			exactPaymentAmount = exactPaymentAmount.sub(orderAmount.mul(discountForSota).div(ZOOM_FEE));
		}
		if (_paymentToken == address(0) && msg.value > 0) {
			require(msg.value >= exactPaymentAmount);
		} else {
			IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), exactPaymentAmount);
		}
		emit Buy(_orderId, _quantity, _paymentToken, exactPaymentAmount);
		return _match(msg.sender, _paymentToken, _orderId, _quantity, estimateToken(_paymentToken, order.price), orderAmount, getRefData(order.owner), getRefData(msg.sender));
	}

	function createBid(
		address _tokenAddress,
		address _paymentToken, // payment method
		uint256 _tokenId,
		uint256 _quantity, // total amount want to buy
		uint256 _price, // price of 1 nft
		uint256 _expTime
	) external payable whenNotPaused() returns (uint256 _bidId) {
		require(_quantity > 0, 'Invalid-quantity');
		require(paymentMethod[_paymentToken], 'Payment-method-does-not-support');
		Bid memory newBid;
		newBid.bidder = msg.sender;
		newBid.bidPrice = _price;
		newBid.quantity = _quantity;
		newBid.tokenId = _tokenId;
		newBid.tokenAddress = _tokenAddress;
		if (msg.value > 0) {
			require(msg.value >= _quantity.mul(_price), 'Invalid-amount');
			newBid.paymentToken = address(0);
		} else {
			newBid.paymentToken = _paymentToken;
		}
		newBid.status = true;
		newBid.expTime = _expTime;
		bids[totalBids] = newBid;
		_bidId = totalBids;
		totalBids = totalBids.add(1);
		emit BidCreated(_bidId, _tokenAddress, _tokenId, _quantity, _price, _paymentToken);
		return _bidId;
	}

	function acceptBid(uint256 _bidId, uint256 _quantity) external whenNotPaused() returns (bool) {
		Bid memory bid = bids[_bidId];
		bytes32 _id = keccak256(abi.encodePacked(bid.tokenAddress, bid.tokenId, msg.sender));
		uint256 _orderId = orderID[_id];
		Order memory order = orders[_orderId];
		require(order.owner == msg.sender && order.isOnsale, 'Oops!Wrong-order-owner-or-cancelled');
		require(order.quantity >= _quantity && _quantity <= bid.quantity && bid.status, 'Invalid-quantity-or-bid-cancelled');
		uint256 orderAmount = bid.bidPrice.mul(_quantity);
		uint256 exactPaymentAmount = orderAmount.mul(ZOOM_FEE + xUser).div(ZOOM_FEE); // 1.025
		if (bid.paymentToken == sota) {
			exactPaymentAmount = exactPaymentAmount.sub(orderAmount.mul(discountForSota).div(ZOOM_FEE));
		}
		if (bid.paymentToken != address(0)) {
			IERC20(bid.paymentToken).safeTransferFrom(bid.bidder, address(this), exactPaymentAmount);
		}
		_match(bid.bidder, bid.paymentToken, _orderId, _quantity, bid.bidPrice, orderAmount, getRefData(msg.sender), getRefData(bid.bidder));
		emit AcceptBid(_bidId);
		return _updateBid(_bidId, _quantity);
	}

	function cancelOrder(uint256 _orderId) external whenNotPaused() {
		Order memory order = orders[_orderId];
		require(order.owner == msg.sender && order.isOnsale, 'Oops!Wrong-order-owner-or-cancelled');
		if (order.isERC721) {
			IERC721(order.tokenAddress).safeTransferFrom(address(this), order.owner, order.tokenId);
		} else {
			IERC1155(order.tokenAddress).safeTransferFrom(
				address(this),
				order.owner,
				order.tokenId,
				order.quantity,
				abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'))
			);
		}
		order.quantity = 0;
		order.isOnsale = false;
		orders[_orderId] = order;
		emit OrderCancelled(_orderId);
	}

	function cancelBid(uint256 _bidId) external whenNotPaused() nonReentrant() {
		Bid memory bid = bids[_bidId];
		require(bid.bidder == msg.sender, 'Invalid-bidder');
		if (bid.paymentToken == address(0)) {
			uint256 payBackAmount = bid.quantity.mul(bid.bidPrice);
			payable(msg.sender).sendValue(payBackAmount);
		}
		bid.status = false;
		bid.quantity = 0;
		bids[_bidId] = bid;
		emit BidCancelled(_bidId);
	}

	function updateOrder(
		uint256 _orderId,
		uint256 _quantity,
		uint256 _price,
		uint256 _retailFee,
		address _retailer
	) external whenNotPaused() {
		Order memory order = orders[_orderId];
		require(order.owner == msg.sender && order.isOnsale, 'Oops!Wrong-order-owner-or-cancelled');
		if (_quantity > order.quantity && !order.isERC721) {
			IERC1155(order.tokenAddress).safeTransferFrom(msg.sender, address(this), order.tokenId, _quantity.sub(order.quantity), '0x');
			order.quantity = _quantity;
		} else if (_quantity < order.quantity) {
			IERC1155(order.tokenAddress).safeTransferFrom(
				address(this),
				msg.sender,
				order.tokenId,
				order.quantity.sub(_quantity),
				abi.encodePacked(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'))
			);
			order.quantity = _quantity;
		}
		order.price = _price;
		orders[_orderId] = order;
		order.retailer = _retailer;
		order.retailFee = _retailFee;
		emit OrderUpdated(_orderId);
	}

	function updateBid(
		uint256 _bidId,
		uint256 _quantity,
		uint256 _bidPrice
	) external whenNotPaused() {
		Bid memory bid = bids[_bidId];
		require(bid.bidder == msg.sender, 'Invalid-bidder');
		bid.quantity = _quantity;
		bid.bidPrice = _bidPrice;
		bids[_bidId] = bid;
		emit BidUpdated(_bidId);
	}

	function adminMigrateData(uint256 _fromOrderId, uint256 _toOrderId) external onlyOwner() {
		for (uint256 i = _fromOrderId; i <= _toOrderId; i++) {
			(	address owner,
				address tokenAddress,
				address paymentToken,
				,
				uint256 tokenId,
				uint256 quantity,
				uint256 price,
				,
				,
				) = ISotaMarket(oldMarket).orders(i);
			if (quantity > 0) {
				IERC1155(tokenAddress).safeTransferFrom(oldMarket, address(this), tokenId, quantity, '0x');
				Order memory newOrder;
				newOrder.isOnsale = true;
				newOrder.owner = owner;
				newOrder.price = price.div(quantity).mul(10000).div(10250);
				newOrder.quantity = quantity;
				newOrder.tokenId = tokenId;
				newOrder.tokenAddress = tokenAddress;
				newOrder.paymentToken = paymentToken;
				orders[totalOrders] = newOrder;
				uint256 _orderId = totalOrders;
				bytes32 _id = keccak256(abi.encodePacked(tokenAddress, tokenId, owner));
				orderID[_id] = _orderId;
			}
			totalOrders = totalOrders.add(1);
		}
	}

	function setApproveForAll(address _token, address _spender) external onlyOwner() {
		IERC1155(_token).setApprovalForAll(_spender, true);
	}

	function setApproveForAllERC721(address _token, address _spender) external onlyOwner() {
		IERC721(_token).setApprovalForAll(_spender, true);
	}
}
