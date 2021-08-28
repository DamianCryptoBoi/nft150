//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockPolka is ERC20 {
	constructor() public ERC20('Polka', 'Polka') {
	}

    function mint(address _to, uint _amount) public {
        _mint(_to, _amount);
    }

}
