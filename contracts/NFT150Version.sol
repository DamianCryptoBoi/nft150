// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import './token/ERC1155Version.sol';

/**
 * @title 1155 General
 * 1155General
 */
contract NFT150Version is ERC1155Version {
	constructor(address _polkaUriAddress) ERC1155Version('NFT150 General', 'NFT150', _polkaUriAddress) {}
}
