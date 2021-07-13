//SPDX-License-Identifier: MIT
pragma solidity ^0.6.6;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockSOTA is ERC20 {
	constructor() public ERC20('SOTA', 'SOTA') {
		_setupDecimals(18);
		_mint(msg.sender, 1000000 * (10**uint256(18)));
	}

	function mint(uint256 amount) external {
		_mint(msg.sender, amount);
	}
}
