pragma solidity ^0.6.6;

interface IOldMarket {
	function items(uint256 id)
		external
		view
		returns (
			address,
			address,
			address,
			uint256,
			uint256,
			uint256,
			uint256,
			uint256,
			uint256,
			uint256
		);

	function adminCancelList(uint256 orderid, address receiver) external;

	function transferOwnership(address _newOwner) external;
}
