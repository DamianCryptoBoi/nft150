pragma solidity ^0.6.6;
import '@openzeppelin/contracts/access/Ownable.sol';

interface IPancakeSwapRouter {
	function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

contract SOTAExchange is Ownable {
	address public pancakeswapRouter = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
	address public USDT = 0x55d398326f99059fF775485246999027B3197955;
	address public WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

	function changeRouter(address _newRouter) external onlyOwner {
		pancakeswapRouter = _newRouter;
	}

	/**
	 * @dev get path for exchange ETH->BNB->USDT via Pancake
	 */
	function getPathFromTokenToUSDT(address token) private view returns (address[] memory) {
		if (token == WBNB) {
			address[] memory path = new address[](2);
			path[0] = WBNB;
			path[1] = USDT;
			return path;
		} else {
			address[] memory path = new address[](3);
			path[0] = token;
			path[1] = WBNB;
			path[2] = USDT;
			return path;
		}
	}

	function getPathFromUsdtToToken(address token) private view returns (address[] memory) {
		if (token == WBNB) {
			address[] memory path = new address[](2);
			path[0] = USDT;
			path[1] = WBNB;
			return path;
		} else {
			address[] memory path = new address[](3);
			path[0] = USDT;
			path[1] = WBNB;
			path[2] = token;
			return path;
		}
	}

	function estimateToUSDT(address _paymentToken, uint256 _paymentAmount) public view returns (uint256) {
		uint256[] memory amounts;
		uint256 result;
		if (_paymentToken != USDT) {
			address[] memory path;
			uint256 amountIn = _paymentAmount;
			if (_paymentToken == address(0)) {
				path = getPathFromTokenToUSDT(WBNB);
				amounts = IPancakeSwapRouter(pancakeswapRouter).getAmountsOut(amountIn, path);
				result = amounts[1];
			} else {
				path = getPathFromTokenToUSDT(_paymentToken);
				amounts = IPancakeSwapRouter(pancakeswapRouter).getAmountsOut(amountIn, path);
				result = amounts[2];
			}
		} else {
			result = _paymentAmount;
		}
		return result;
	}

	function estimateFromUSDT(address _paymentToken, uint256 _usdtAmount) public view returns (uint256) {
		uint256[] memory amounts;
		uint256 result;
		if (_paymentToken != USDT) {
			address[] memory path;
			uint256 amountIn = _usdtAmount;
			if (_paymentToken == address(0)) {
				path = getPathFromUsdtToToken(WBNB);
				amounts = IPancakeSwapRouter(pancakeswapRouter).getAmountsOut(amountIn, path);
				result = amounts[1];
			} else {
				path = getPathFromUsdtToToken(_paymentToken);
				amounts = IPancakeSwapRouter(pancakeswapRouter).getAmountsOut(amountIn, path);
				result = amounts[2];
			}
		} else {
			result = _usdtAmount;
		}
		return result;
	}
}
