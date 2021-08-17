//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockSOTA is ERC20 {
	constructor() public ERC20('SOTA', 'SOTA') {
	}

    function mint(address _to, uint _amount) public {
        _mint(_to, _amount);
    }

}
