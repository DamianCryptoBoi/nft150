pragma solidity ^0.8.0;
import "hardhat/console.sol";
contract MockBSCswapRouter {
    function getAmountsOut(uint amountIn, address[] memory path) public returns (uint[] memory amounts) {


        require(path.length >= 2, 'PancakeLibrary: INVALID_PATH');
        amounts = new uint[](path.length);

        console.log("path.length   ", path.length);

        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            amounts[i + 1] = amountIn; // compare 1-1
        }

        return amounts;
    }

}
