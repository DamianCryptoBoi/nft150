// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Context {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor () { }
    // solhint-disable-previous-line no-empty-blocks

//    function _msgSender() internal view returns (address payable) {
//        return msg.sender;
//    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

//    function _msgData() internal view returns (bytes memory) {
//        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
//        return msg.data;
//    }
    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}