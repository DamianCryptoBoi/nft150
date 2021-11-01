// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./token/ERC1155Tradeble.sol";

/**
 * @title 1155 General
 * 1155General
 */
contract NFT150 is ERC1155Tradeble {
    constructor(address _polkaUriAddress) ERC1155Tradeble("NFT150 General", "NFT150", _polkaUriAddress) {}
}
