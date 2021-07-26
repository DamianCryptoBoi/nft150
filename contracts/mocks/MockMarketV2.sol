pragma solidity ^0.8.0;
//
import '../SotaMarketV2.sol';
contract MockMarketV2 is SotaMarketV2 {

    //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    function getOwn() public view returns (address) {
        return msg.sender;
    }

    function getWBNB() public view returns (address) {
        return WBNB;
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
//	uint256 public discountForBuyer = 50;
//	uint256 public discountForSota = 100; // discount for user who made payment in sota

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
    function mockGetdiscountForBuyer() public view returns (uint256) {
        return discountForBuyer;
    }
    function mockGetdiscountForSota() public view returns (uint256) {
        return discountForSota;
    }

    function mockPaymentMethod(address _token) public view returns (bool) {
        return paymentMethod[_token];
    }



}
