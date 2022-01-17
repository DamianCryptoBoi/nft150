// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../libs/Strings.sol';

import '../dependencies/Ownable.sol';
import '../dependencies/MinterRole.sol';
import '../dependencies/WhitelistAdminRole.sol';
import '../dependencies/ProxyRegistry.sol';

import './ERC1155.sol';
import './ERC1155MintBurn.sol';
import './ERC1155Metadata.sol';
import '../interfaces/IPolkaURI.sol';

contract ERC1155Version is ERC1155, ERC1155MintBurn, ERC1155Metadata, Ownable, MinterRole, WhitelistAdminRole {
	using Strings for string;
	using SafeMath for uint256;

	address proxyRegistryAddress;
	uint256 public _currentTokenID = 0;
	mapping(uint256 => address) public creators;
	mapping(uint256 => uint256) public loyaltyFee;
	mapping(uint256 => uint256) public xUserFee;
	mapping(uint256 => uint256) public tokenSupply;
	mapping(uint256 => uint256) public tokenMaxSupply;
	mapping(uint256 => string) public tokenURI;
	mapping(uint256 => mapping(uint256 => address)) public nftOwnVersion;
	mapping(uint256 => mapping(uint256 => bool)) public nftOnSaleVersion;
	address public polkaUriAddress;

	// Contract name
	string public name;
	// Contract symbol
	string public symbol;

	event Create(
		address indexed _creator,
		uint256 indexed _id,
		uint256 indexed _loyaltyFee,
		uint256 _maxSupply,
		uint256 _initSupply,
		uint256 _xUserFee
	);

	constructor(
		string memory _name,
		string memory _symbol,
		address _polkaUriAddress
	) {
		name = _name;
		symbol = _symbol;
		polkaUriAddress = _polkaUriAddress;
	}

	function uri(uint256 _id) public view returns (string memory) {
		require(_exists(_id), 'ERC721Tradable#uri: NONEXISTENT_TOKEN');
		return Strings.strConcat(IPolkaURI(polkaUriAddress).baseMetadataURI(), tokenURI[_id]);
	}

	function setPolkaUriAddress(address _polkaUriAddress) external onlyOwner {
		polkaUriAddress = _polkaUriAddress;
	}

	/**
	 * @dev Returns the total quantity for a token ID
	 * @param _id uint256 ID of the token to query
	 * @return amount of token in existence
	 */
	function totalSupply(uint256 _id) public view returns (uint256) {
		return tokenSupply[_id];
	}

	/**
	 * @dev Returns the max quantity for a token ID
	 * @param _id uint256 ID of the token to query
	 * @return amount of token in existence
	 */
	function maxSupply(uint256 _id) public view returns (uint256) {
		return tokenMaxSupply[_id];
	}

	/**
	 * @dev Will update the base URL of token's URI
	 * @param _newBaseMetadataURI New base URL of token's URI
	 */
	function setBaseMetadataURI(string memory _newBaseMetadataURI)
		public
		//    onlyWhitelistAdmin
		onlyOwner
	{
		_setBaseMetadataURI(_newBaseMetadataURI);
	}

	/**
	 * @dev Creates a new token type and assigns _initialSupply to an address
	 * @param _maxSupply max supply allowed
	 * @param _initialSupply Optional amount to supply the first owner
	 * @param _uri Optional URI for this token type
	 * @param _data Optional data to pass if receiver is contract
	 * @return tokenId The newly created token ID
	 */
	function create(
		uint256 _maxSupply,
		uint256 _initialSupply,
		uint256 _loyaltyFee,
		string memory _uri,
		bytes memory _data,
		uint256 _xUserFee
	) public returns (uint256 tokenId) {
		require(_initialSupply <= _maxSupply, 'Initial supply cannot be more than max supply');
		require(0 <= _loyaltyFee && _loyaltyFee <= 10000, 'Invalid-loyalty-fee');
		require(0 <= _xUserFee && _xUserFee <= 10000, 'Invalid-user-fee');

		uint256 _id = _getNextTokenID();
		_incrementTokenTypeId();
		creators[_id] = msg.sender;
		loyaltyFee[_id] = _loyaltyFee;
		xUserFee[_id] = _xUserFee;
		tokenURI[_id] = _uri;

		if (_initialSupply != 0) _mint(msg.sender, _id, _initialSupply, _data);
		tokenSupply[_id] = _initialSupply;
		tokenMaxSupply[_id] = _maxSupply;
		for (uint256 i = 1; i <= _initialSupply; i++) {
			nftOwnVersion[_id][i] = msg.sender;
			nftOnSaleVersion[_id][i] = false;
		}

		emit Create(msg.sender, _id, _loyaltyFee, _maxSupply, _initialSupply, _xUserFee);
		return _id;
	}

	/**
	 * @dev Mints some amount of tokens to an address
	 * @param _to          Address of the future owner of the token
	 * @param _id          Token ID to mint
	 * @param _quantity    Amount of tokens to mint
	 * @param _data        Data to pass if receiver is contract
	 */
	function mint(
		address _to,
		uint256 _id,
		uint256 _quantity,
		bytes memory _data
	) public {
		uint256 tokenId = _id;
		require(creators[tokenId] == msg.sender, 'Only-creator-can-mint');
		require(tokenSupply[tokenId] < tokenMaxSupply[tokenId], 'Max supply reached');
		_mint(_to, _id, _quantity, _data);
		tokenSupply[_id] = tokenSupply[_id].add(_quantity);
	}

	/**
	 * Set proxyRegistryAddress
	 */
	function setProxyAddress(address _proxyRegistryAddress) public onlyOwner returns (bool) {
		proxyRegistryAddress = _proxyRegistryAddress;
		return true;
	}

	/**
	 * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
	 */
	function isApprovedForAll(address _owner, address _operator)
		public
		view
		override(ERC1155)
		returns (bool isOperator)
	{
		if (proxyRegistryAddress != address(0)) {
			ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
			if (address(proxyRegistry.proxies(_owner)) == _operator) {
				return true;
			}
		}
		return ERC1155.isApprovedForAll(_owner, _operator);
	}

	/**
	 * @dev Returns whether the specified token exists by checking to see if it has a creator
	 * @param _id uint256 ID of the token to query the existence of
	 * @return bool whether the token exists
	 */
	function _exists(uint256 _id) internal view returns (bool) {
		return creators[_id] != address(0);
	}

	/**
	 * @dev calculates the next token ID based on value of _currentTokenID
	 * @return uint256 for the next token ID
	 */
	function _getNextTokenID() private view returns (uint256) {
		return _currentTokenID.add(1);
	}

	/**
	 * @dev increments the value of _currentTokenID
	 */
	function _incrementTokenTypeId() private {
		_currentTokenID++;
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

	function setNftOwnVersion(
		uint256 _id,
		uint256 _version,
		address owner
	) external {
		nftOwnVersion[_id][_version] = owner;
	}

	function setNftOnSaleVersion(
		uint256 _id,
		uint256 _version,
		bool isOnSale
	) external {
		nftOnSaleVersion[_id][_version] = isOnSale;
	}
}
