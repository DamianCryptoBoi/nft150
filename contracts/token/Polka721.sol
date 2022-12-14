//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../interfaces/IPolkaURI.sol";

contract Polka721 is ERC721, Ownable, ERC721URIStorage {
	using SafeMath for uint256;

	uint256 public _currentTokenId = 0;

	address public polkaUriAddress;

	mapping(uint256 => address) public creators;
	mapping(uint256 => uint256) public loyaltyFee;
	mapping(uint256 => uint256) public xUserFee;
	mapping(uint256 => string) public tokenURIs;

	constructor(string memory _name, string memory _symbol, address _polkaUriAddress) ERC721(_name, _symbol) {
		polkaUriAddress = _polkaUriAddress;
	}

	function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) virtual{
		super._burn(tokenId);
    }

	function _baseURI() internal view override returns (string memory) {
		return IPolkaURI(polkaUriAddress).baseMetadataURI();
    }

	function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return string(abi.encodePacked(_baseURI(), tokenURIs[tokenId]));
    }


	/**
	 * @dev Create new NFT
	 * @param _loyaltyFee of tokenID
	 */
	function create(string calldata _tokenURI, uint256 _loyaltyFee, uint256 _xUserFee) external {
		uint256 newTokenId = _getNextTokenId();
		_mint(msg.sender, newTokenId);
		creators[newTokenId] = msg.sender;
		loyaltyFee[newTokenId] = _loyaltyFee;
		xUserFee[newTokenId] = _xUserFee;
		tokenURIs[newTokenId] = _tokenURI;

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

	function setPolkaUriAddress(address _polkaUriAddress) external onlyOwner() {
		polkaUriAddress = _polkaUriAddress;
	}

	function getCreator(uint256 _id) public view returns (address) {
		return creators[_id];
	}

	function getLoyaltyFee(uint256 _id) public view returns (uint256) {
		return loyaltyFee[_id];
	}

	function getXUserFee(uint256 _id) public view returns (uint256) {
		return xUserFee[_id];
	}
}
