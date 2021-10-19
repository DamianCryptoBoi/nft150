//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './token/Polka721.sol';

contract Polka721Artist is Polka721 {
	constructor(string memory _name, string memory _symbol) Polka721(_name, _symbol) {
	}
}
