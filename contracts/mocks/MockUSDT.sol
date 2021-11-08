//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockUSDT is ERC20 {
	constructor() public ERC20('USDT', 'USDT') {

		_mint(msg.sender, 1000000 * 10 ** decimals());
	}

	function decimals() public view virtual override returns (uint8) {
        return 6;
    }
	function mint(uint256 amount) external {
		_mint(msg.sender, amount);
	}
}
