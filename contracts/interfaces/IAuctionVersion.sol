// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IAuctionVersion {
	function auctions(uint256 id)
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

	function bidAuctions(uint256 id)
		external
		view
		returns (
			address,
			address,
			address,
			uint256,
			uint256,
			uint256,
			bool,
			bool,
			bool,
			uint256
		);

	function totalAuctions() external view returns (uint256);

	function totalBidAuctions() external view returns (uint256);

	function versionOnAuction(
		address tokenAddress,
		uint256 tokenId,
		uint256 version
	) external view returns (bool);
}
