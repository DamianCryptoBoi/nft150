pragma solidity ^0.6.6;

interface IProfitEstimator {
	function profitToCreator(
		address _nft,
		address _paymentToken,
		uint256 _tokenId,
		uint256 _amount,
		uint256 _price,
		uint256 _lastBuyPriceInUSD
	) external payable returns (uint256);
}
