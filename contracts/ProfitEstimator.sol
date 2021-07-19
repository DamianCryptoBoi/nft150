// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/ISOTANFT.sol';
import './interfaces/ISotaExchange.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

contract ProfitEstimator is Ownable {
	using SafeMath for uint256;

	address public sotaMarket;
	address public sotaExchangeContract;
	uint256 public xUser = 250; // 2.5%
	uint256 public constant ZOOM_FEE = 10**4;
	modifier onlyMarket() {
		require(msg.sender == sotaMarket, 'Invalid-sender');
		_;
	}

	constructor(address _sotaMarket, address _sotaExchangeContract) public {
		sotaMarket = _sotaMarket;
		sotaExchangeContract = _sotaExchangeContract;
	}

	function setMarket(address _sotaMarket) external onlyOwner() {
		sotaMarket = _sotaMarket;
	}

	function setFee(uint256 _xUser) external onlyOwner() {
		xUser = _xUser;
	}

	function estimateUSDT(address _paymentToken, uint256 _paymentAmount) private view returns (uint256) {
		return ISotaExchange(sotaExchangeContract).estimateToUSDT(_paymentToken, _paymentAmount);
	}

	function estimateToken(address _paymentToken, uint256 _usdtAmount) private view returns (uint256) {
		return ISotaExchange(sotaExchangeContract).estimateFromUSDT(_paymentToken, _usdtAmount);
	}

	function profitToCreator(
		address _nft,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _amount,
		uint256 _price,
		uint256 _lastBuyPriceInUSD
	) external onlyMarket() returns (uint256) {
		uint256 loyaltyFee = ISOTANFT(_nft).getLoyaltyFee(_tokenId);
		uint256 buyPriceInUSD = estimateUSDT(_paymentToken, _price);
		if (buyPriceInUSD > _lastBuyPriceInUSD) {
			uint totalSell = buyPriceInUSD.mul(_amount).mul(ZOOM_FEE - xUser).div(ZOOM_FEE);
			uint totalBuy = _lastBuyPriceInUSD.mul(_amount).mul(ZOOM_FEE + xUser).div(ZOOM_FEE);
			if(totalSell > totalBuy)  {
				uint256 profitInUSDT = totalSell.sub(totalBuy);
				return estimateToken(_paymentToken, profitInUSDT.mul(loyaltyFee).div(ZOOM_FEE));
			}
		}
		return 0;
	}
}
