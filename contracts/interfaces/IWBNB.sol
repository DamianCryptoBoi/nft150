pragma solidity ^0.6.6;

interface IWBNB {
	function deposit() external payable returns (bool);

	function withdraw(uint256 _id) external returns (bool);
}
