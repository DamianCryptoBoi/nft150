// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './token/ERC1155Artist.sol';

/**
 * @title 1155 General
 * 1155General
 */
contract NFT150Artist is ERC1155Artist {
	constructor(
		string memory _name,
		string memory _symbol,
		address _polkaUriAddress
	) ERC1155Artist(_name, _symbol, _polkaUriAddress) {}
}
