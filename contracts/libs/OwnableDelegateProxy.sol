// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './OwnedUpgradeabilityProxy.sol';

contract OwnableDelegateProxy is OwnedUpgradeabilityProxy {
	constructor(
		address owner,
		address initialImplementation,
		bytes memory callData
	) public {
		setUpgradeabilityOwner(owner);
		_upgradeTo(initialImplementation);
		(bool result, ) = initialImplementation.delegatecall(callData);
		require(result);
	}
}
