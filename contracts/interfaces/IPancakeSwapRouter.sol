pragma solidity ^0.6.6;

interface IPancakeSwapRouter {
	function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}
