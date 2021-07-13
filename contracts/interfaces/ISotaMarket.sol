pragma solidity ^0.6.6;

interface ISotaMarket {
	function orders(uint256 id)
		external
		view
		returns (
			address,
            address,
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256 ,
            bool,
            bool
		);
}
