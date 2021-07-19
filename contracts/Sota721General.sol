//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Sota721General is ERC721, Ownable, ERC721URIStorage {
	using SafeMath for uint256;

	uint256 public _currentTokenId = 0;
	mapping(uint256 => address) public creators;
	mapping(uint256 => uint256) public loyaltyFee;

	constructor() public ERC721('Sota Platform ERC721 NFTs', 'SOTA721GENERAL') {
		//_setBaseURI('https://storage.sota.finance');
	}

	function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) virtual{
    }

	function _baseURI() internal pure override returns (string memory) {
        return "https://storage.sota.finance";
    }

	function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
	/**
	 * @dev Create new NFT
	 * @param _tokenURI _tokenURI of tokenID
	 */

	function create(string calldata _tokenURI, uint256 _loyaltyFee) external {
		uint256 newTokenId = _getNextTokenId();
		_mint(msg.sender, newTokenId);
		creators[newTokenId] = msg.sender;
		loyaltyFee[newTokenId] = _loyaltyFee;
//		_setTokenURI(newTokenId, _tokenURI); //deprecation solidity 4.x
		tokenURI(newTokenId); //change for deprecation solidity 4.x
		_incrementTokenId();
	}

	/**
	 * @dev calculates the next token ID based on value of _currentTokenId
	 * @return uint256 for the next token ID
	 */
	function _getNextTokenId() private view returns (uint256) {
		return _currentTokenId.add(1);
	}

	/**
	 * @dev increments the value of _currentTokenId
	 */
	function _incrementTokenId() private {
		_currentTokenId++;
	}

	function setBaseURI(string calldata baseURI_) external onlyOwner() {
		//_setBaseURI(baseURI_);
		_baseURI();
	}

	function getCreator(uint256 _id) public view returns (address) {
		return creators[_id];
	}

	function getLoyaltyFee(uint256 _id) public view returns (uint256) {
		return loyaltyFee[_id];
	}
}
