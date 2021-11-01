// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IWBNB {
	function deposit() external payable returns (bool);

	function withdraw(uint256 _id) external returns (bool);
}
