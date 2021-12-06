// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkaMarket {
	function orders(uint256 id)
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
            uint256,
            uint256
		);

    function bids(uint256 id)
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
            bool,
            uint256
		);

    function totalOrders() external view returns(uint256);
    function totalBids() external view returns(uint256);

    function setApproveForAll(address _token, address _spender) external;
    function setApproveForAllERC721(address _token, address _spender) external;

    function nftVersion(address _tokenAddress, uint256 _tokenId, uint256 _version) external view returns(address);
    function nftVersionOnSale(address _tokenAddress, uint256 _tokenId, uint256 _version) external view returns(bool);
    function orderIdByVersion(address _tokenAddress, uint256 _tokenId, uint256 _version) external view returns(uint256);

    function createVersionNFT(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _fromVersion,
        uint256 _toVersion,
        address _owner
    ) external;


}
