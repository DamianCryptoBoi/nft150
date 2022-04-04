// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import './AuctionV3.sol';

contract AuctionTestUpgrade is AuctionV3 {
	uint256 public value;

	function initialize() public virtual override initializer {
		AuctionV3.initialize();
	}

	function isUpgraded() public pure returns (bool) {
		return true;
	}

	function setValue(uint256 _value) public {
		value = _value;
	}
}

contract AuctionTestUpgrade2 is AuctionTestUpgrade {
	function initialize() public override initializer {
		AuctionTestUpgrade.initialize();
	}

	function isUpgradedTwice() public pure returns (bool) {
		return true;
	}
}
