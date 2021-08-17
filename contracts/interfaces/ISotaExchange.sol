pragma solidity ^0.8.0;

interface ISotaExchange {
	function estimateToUSDT(address _paymentToken, uint256 _paymentAmount) external view returns (uint256);

	function estimateFromUSDT(address _paymentToken, uint256 _usdtAmount) external view returns (uint256);
}
