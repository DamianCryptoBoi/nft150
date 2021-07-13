pragma solidity ^0.6.6;

interface ISOTANFT {
	function getCreator(uint256 _id) external view returns (address);

	function getLoyaltyFee(uint256 _id) external view returns (uint256);
}
