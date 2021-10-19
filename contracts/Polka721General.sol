//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './token/Polka721.sol';

contract Polka721General is Polka721 {
	constructor() Polka721('Polka Platform ERC721 NFTs', 'POLKA721GENERAL') {
	}
}
