// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../MarketV3.sol';
contract MockMarketV2 is MarketV3 {

    //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    function getOwn() public view returns (address) {
        return msg.sender;
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
