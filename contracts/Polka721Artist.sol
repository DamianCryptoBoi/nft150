//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './token/ERC721Artist.sol';

contract Polka721Artist is ERC721Artist {
	constructor(
		string memory _name,
		string memory _symbol,
		address _polkaUriAddress
	) ERC721Artist(_name, _symbol, _polkaUriAddress) {}
}
