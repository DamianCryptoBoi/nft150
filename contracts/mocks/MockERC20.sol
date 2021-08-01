//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20 is ERC20 {
	constructor() public ERC20('MockERC20', 'MockERC20') {
	}

    function mint(address _to, uint _amount) public {
        _mint(_to, _amount);
    }

}
