pragma solidity ^0.8.0;

contract ExchangeDev {
	address public SOTA = 0xaA4c85035F71E579833f0ec37a767eDbAA5C05bF;
	address public USDT = 0x584119951fA66bf223312A29FB6EDEBdd957C5d8;
	address public WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;

	function estimateToUSDT(address _paymentToken, uint256 _paymentAmount) public view returns (uint256) {
		if (_paymentToken == address(0)) {
			return _paymentAmount * 300;
		} else if (_paymentToken == SOTA) {
			return _paymentAmount / 2;
		} else if (_paymentToken == USDT) {
			return _paymentAmount;
		}
	}

	function estimateFromUSDT(address _paymentToken, uint256 _usdtAmount) public view returns (uint256) {
		if (_paymentToken == address(0)) {
			return _usdtAmount / 300;
		} else if (_paymentToken == SOTA) {
			return _usdtAmount * 2;
		} else if (_paymentToken == USDT) {
			return _usdtAmount;
		}
	}
}
