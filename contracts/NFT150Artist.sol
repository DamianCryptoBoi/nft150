// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./token/ERC1155Tradeble.sol";

/**
 * @title 1155 General
 * 1155General
 */
contract NFT150Artist is ERC1155Tradeble {
    constructor(string memory _name, string memory _symbol) ERC1155Tradeble(_name, _symbol)
    {
        _setBaseMetadataURI("https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/"); //TODO
    }
}
