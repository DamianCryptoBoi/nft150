// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../MarketV3.sol';
contract MockMarketV2 is MarketV3 {

    //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    function getOwn() public view returns (address) {
        return msg.sender;
    }

    function mockIsOperator(address addr) public view returns (bool) {
        return isOperator[addr];
    }

    function mockIsRetailer(address addr) public view returns (bool) {
        return isRetailer[addr];
    }

//    uint256 public xUser = 250; // 2.5%
//	uint256 public xCreator = 1500;
//	uint256 public yRefRate = 5000; // 50%
//	uint256 public zProfitToCreator = 5000; // 10% profit

    function mockGetxUser() public view returns (uint256) {
        return xUser;
    }
    function mockGetxCreator() public view returns (uint256) {
        return xCreator;
    }
    function mockGetyRefRate() public view returns (uint256) {
        return yRefRate;
    }
    function mockGetzProfitToCreator() public view returns (uint256) {
        return zProfitToCreator;
    }
//    function mockGetdiscountForBuyer() public view returns (uint256) {
//        return discountForBuyer;
//    }
//    function mockGetdiscountForPolka() public view returns (uint256) {
//        return discountForPolka;
//    }

    function mockPaymentMethod(address _token) public view returns (bool) {
        return paymentMethod[_token];
    }

    function mockTotalOrders() public view returns (uint256) {
        return totalOrders;
    }
    function mockTotalBids() public view returns (uint256) {
        return totalBids;
    }
    function mockGetOrder(uint256 orderId) public view returns (Order memory) {
        return orders[orderId];
    }
    function mockGetBid(uint256 bidId) public view returns (Bid memory) {
        return bids[bidId];
    }


}
