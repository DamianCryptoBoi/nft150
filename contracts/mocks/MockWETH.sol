//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockWETH is ERC20 {
	constructor() ERC20('MockWETH', 'MockWETH') {
        _mint(msg.sender, 1000000 * 10 ** decimals());
	}

    function mint(address _to, uint _amount) public {
        _mint(_to, _amount);
    }

}
