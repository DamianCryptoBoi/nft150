// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPOLKANFT {
	function getCreator(uint256 _id) external view returns (address);

	function getLoyaltyFee(uint256 _id) external view returns (uint256);
}
