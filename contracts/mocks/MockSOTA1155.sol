pragma solidity ^0.8.0;
import '../libs/ERC1155Tradable.sol';

contract MockSOTA1155 is ERC1155Tradable {
	constructor() public ERC1155Tradable('SOTA1155', 'SOTA1155') {
		_setBaseMetadataURI('https://api.sotadx.com/');
	}

	function getCreator(uint256 _id) public view returns (address) {
		return creators[_id];
	}

	function getLoyaltyFee(uint256 _id) public view returns (uint256) {
		return loyaltyFee[_id];
	}
}
