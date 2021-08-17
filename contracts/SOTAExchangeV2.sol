// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IBSCswapRouter {
    function getAmountsOut(
        uint amountIn,
        address[] calldata path)
    external view returns (uint[] memory amounts);
}

contract SOTAExchangeV2 is Ownable {
    address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
    address public usdt; // 0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684 => get price
    address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 => compare with payment token market
    address public busd; // 0x78867bbeef44f2326bf8ddd1941a4439382ef2a7
    address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd

    constructor(address _bnbRouter, address _usdt, address _busd, address _bnb) public {
        bnbRouter = _bnbRouter;
        usdt = _usdt;
        usdtMarket = _usdt;
        busd = _busd;
        bnb = _bnb;
    }

    function setBnbRouter(address _bnbRouter) onlyOwner public returns (bool) {
        bnbRouter = _bnbRouter;
        return true;
    }

    function setUsdtMarket(address _usdt) onlyOwner public returns (bool) {
        usdtMarket = _usdt;
        return true;
    }

    function setUsdt(address _usdt) onlyOwner public returns (bool) {
        usdt = _usdt;
        return true;
    }

    function setBnb(address _bnb) onlyOwner public returns (bool) {
        bnb = _bnb;
        return true;
    }

    function setBusd(address _busd) onlyOwner public returns (bool) {
        busd = _busd;
        return true;
    }

    /**
     * @dev get path for exchange ETH->BNB->USDT via Uniswap
     */
    function getPathFromTokenToUSDT(address token) private view returns (address[] memory) {
        if (token == bnb || token == busd) {
            address[] memory path = new address[](2);
            path[0] = token;
            path[1] = usdt;
            return path;
        } else {
            address[] memory path = new address[](3);
            path[0] = token;
            path[1] = bnb;
            path[2] = usdt;
            return path;
        }
    }

    function getPathFromUsdtToToken(address token) private view returns (address[] memory) {
        if (token == bnb || token == busd) {
            address[] memory path = new address[](2);
            path[0] = usdt;
            path[1] = token;
            return path;
        } else {
            address[] memory path = new address[](3);
            path[0] = usdt;
            path[1] = bnb;
            path[2] = token;
            return path;
        }
    }

    function estimateToUSDT(address _paymentToken, uint256 _paymentAmount) public view returns (uint256) {
        uint256[] memory amounts;
        uint256 result;
        if (_paymentToken != usdt && _paymentToken != usdtMarket) {
            address[] memory path;
            uint256 amountIn = _paymentAmount;
            if (_paymentToken == address(0)) {
                path = getPathFromTokenToUSDT(bnb);
                amounts = IBSCswapRouter(bnbRouter).getAmountsOut(
                    amountIn,
                    path
                );
                result = amounts[1];
            } else {
                path = getPathFromTokenToUSDT(_paymentToken);
                amounts = IBSCswapRouter(bnbRouter).getAmountsOut(
                    amountIn,
                    path
                );
//                result = amounts[2]
                result = amounts[1];// path leng = 2

            }
        } else {
            result = _paymentAmount;
        }
        return result;
    }

    function estimateFromUSDT(address _paymentToken, uint256 _usdtAmount) public view returns (uint256) {
        uint256[] memory amounts;
        uint256 result;
        if (_paymentToken != usdt && _paymentToken != usdtMarket) {
            address[] memory path;
            uint256 amountIn = _usdtAmount;
            if (_paymentToken == address(0)) {
                path = getPathFromUsdtToToken(bnb);
                amounts = IBSCswapRouter(bnbRouter).getAmountsOut(
                    amountIn,
                    path
                );
                result = amounts[1];
            } else {
                path = getPathFromUsdtToToken(_paymentToken);
                amounts = IBSCswapRouter(bnbRouter).getAmountsOut(
                    amountIn,
                    path
                );
//                result = amounts[2];
                result = amounts[1];
            }
        } else {
            result = _usdtAmount;
        }
        return result;
    }
}