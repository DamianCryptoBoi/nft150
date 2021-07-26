//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Sota721General is ERC721, Ownable, ERC721URIStorage {
	using SafeMath for uint256;

	uint256 public _currentTokenId = 0;
	string public baseURI = "https://storage.sota.finance/"; //TODO waiting Customer supply

	mapping(uint256 => address) public creators;
	mapping(uint256 => uint256) public loyaltyFee;

	constructor() ERC721('Sota Platform ERC721 NFTs', 'SOTA721GENERAL') { //TODO change
		//_setBaseURI('https://storage.sota.finance');
	}
    function name1() public view returns (string memory) {
        return baseURI;
    }
	function own() public view returns (address) {
        return msg.sender;
    }
	function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) virtual{
		super._burn(tokenId);
    }

	function _baseURI() internal view override returns (string memory) {
        return baseURI; //TODO waiting Customer supply
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
	 * @param _loyaltyFee of tokenID
	 */

//	function create(string calldata _tokenURI, uint256 _loyaltyFee) external {
	function create(uint256 _loyaltyFee) external {
		uint256 newTokenId = _getNextTokenId();
		_mint(msg.sender, newTokenId);
		creators[newTokenId] = msg.sender;
		loyaltyFee[newTokenId] = _loyaltyFee;
//		_setTokenURI(newTokenId, _tokenURI); //deprecation solidity 4.x
//		tokenURI(newTokenId); //change for deprecation solidity 4.x
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
		baseURI = baseURI_;
	}

	function getCreator(uint256 _id) public view returns (address) {
		return creators[_id];
	}

	function getLoyaltyFee(uint256 _id) public view returns (uint256) {
		return loyaltyFee[_id];
	}
}
