pragma solidity ^0.8.0;

interface INft150V1 {
	function balanceOf(address account, uint256 id) external view returns (uint256);

	function creators(uint256 _id) external returns (address);

	function loyaltyFee(uint256 _id) external returns (uint256);

	function xUserFee(uint256 _id) external returns (uint256);

	function tokenSupply(uint256 _id) external returns (uint256);

	function tokenMaxSupply(uint256 _id) external returns (uint256);

	function tokenURI(uint256 _id) external returns (string memory);

	function nftOwnVersion(uint256 _id, uint256 _version) external returns (address);
}
