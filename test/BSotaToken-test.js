const { expect, assert } = require("chai");

describe("Unit testing - Market", function() {
    let mockMarketV2;
    let nft150;
    let sota721General;

    beforeEach(async function () {
        [owner, addr] = await ethers.getSigners();
//        SotaMarketV2 = await hre.ethers.getContractFactory("SotaMarketV2");
        MockMarketV2 = await hre.ethers.getContractFactory("MockMarketV2");
        mockMarketV2 = await MockMarketV2.deploy();
        await mockMarketV2.deployed();

        MockSOTA = await hre.ethers.getContractFactory("MockSOTA");
        mockSOTA = await MockSOTA.deploy();
        await mockSOTA.deployed();

        Sota721General = await hre.ethers.getContractFactory("Sota721General");
        sota721General = await Sota721General.deploy();
        await sota721General.deployed();

        NFT150 = await hre.ethers.getContractFactory("NFT150");
        nft150 = await NFT150.deploy();
        await nft150.deployed();

        //SOTAReferral
        const SOTAReferral = await hre.ethers.getContractFactory("SOTAReferral");
        const sotaReferral = await SOTAReferral.deploy();
        await sotaReferral.deployed();

        //SOTAExchange
        const MockSOTAExchange = await hre.ethers.getContractFactory("MockSotaExchange");
        const mockSOTAExchange = await MockSOTAExchange.deploy();
        await mockSOTAExchange.deployed();

        await mockMarketV2.setReferralContract(sotaReferral.address);
        await mockMarketV2.setSotaExchangeContract(mockSOTAExchange.address);

        await mockMarketV2.setPaymentMethod(mockSOTA.address, true);
        await mockMarketV2.addSOTANFTs(sota721General.address, true, true);
        await mockMarketV2.addSOTANFTs(nft150.address, true, false);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await mockMarketV2.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
            expect(await mockMarketV2.getWBNB()).to.equal("0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd");
            expect(await mockMarketV2.mockIsOperator(owner.address)).to.equal(true); //TODO
            expect(await mockMarketV2.mockIsOperator(addr.address)).to.be.false; //TODO
        });
    });
    describe("Transactions", function () {
        it("whiteListOperator", async function() {
            await mockMarketV2.whiteListOperator(addr.address, true);
            expect(await mockMarketV2.mockIsOperator(addr.address)).to.be.true;

            await mockMarketV2.whiteListOperator(addr.address, false);
            expect(await mockMarketV2.mockIsOperator(addr.address)).to.be.false;
        });

        it("whiteListRetailer", async function() {
            await mockMarketV2.whiteListRetailer(addr.address, true);
            expect(await mockMarketV2.mockIsRetailer(addr.address)).to.be.true;

            await mockMarketV2.whiteListRetailer(addr.address, false);
            expect(await mockMarketV2.mockIsRetailer(addr.address)).to.be.false;
        });

        it("setSystemFee", async function() {

            //  uint256 public xUser = 250; // 2.5%
            //	uint256 public xCreator = 1500;
            //	uint256 public yRefRate = 5000; // 50%
            //	uint256 public zProfitToCreator = 5000; // 10% profit
            //	uint256 public discountForBuyer = 50;
            //	uint256 public discountForSota = 100;
            await mockMarketV2.setSystemFee(
                9999,
                9999,
                9999,
                9999,
                9999,
                9999);

            expect((await mockMarketV2.mockGetxUser()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetxCreator()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetyRefRate()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetzProfitToCreator()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetdiscountForBuyer()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetdiscountForSota()).toNumber()).to.equal(9999);

            //restore value
            await mockMarketV2.setSystemFee(
                250,
                1500,
                5000,
                5000,
                50,
                100);
        });

         it("setPaymentMethod", async function() {
            expect(await mockMarketV2.mockPaymentMethod(mockSOTA.address)).to.be.true;

            // 2**256 - 1 to HEX or 115792089237316195423570985008687907853269984665640564039457584007913129639935
            expect((await mockSOTA.allowance(mockMarketV2.address , owner.address)).toHexString()).to.equal(
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
         });

         //withdrawFunds => only admin call - onlyOwner => don`t unit test

        it("createOrder new 721", async function() {

            //      address _tokenAddress,
            //		address _retailer,
            //		address _paymentToken, // payment method
            //		uint256 _tokenId,
            //		uint256 _quantity, // total amount for sale
            //		uint256 _price, // price of 1 nft
            //		uint256 _retailFee
            await sota721General.create('urltest', 100);
            await sota721General.setApprovalForAll(mockMarketV2.address, true);

            expect(await sota721General.ownerOf(1)).to.equal(owner.address);

            //create _tokenId 1
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                sota721General.address,
                owner.address,
                mockSOTA.address,
                1,
                1,
                100,
                10
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);

            expect(await sota721General.ownerOf(1)).to.equal(mockMarketV2.address);

         });

         it("createOrder new 1155", async function() {
            //        uint256 _maxSupply,
            //        uint256 _initialSupply,
            //        uint256 _loyaltyFee,
            //        string memory _uri,
            //        bytes memory _data
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);
            expect((await nft150.balanceOf(mockMarketV2.address, 1)).toNumber()).to.equal(50);
         });

         it("Buy 721", async function() {
            //mint
            await sota721General.create('urltest', 100);
            await sota721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await sota721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            let orderId = await mockMarketV2.createOrder(
                sota721General.address,
                owner.address,
                mockSOTA.address,
                1,
                1,
                100,
                10
            );

            //            buy(
            //                uint256 _orderId,
            //                uint256 _quantity,
            //                address _paymentToken
            //            )
            await mockSOTA.mint(addr.address, 1000000000);
            await mockSOTA.connect(addr).approve(mockMarketV2.address, 1000000000);

            await mockMarketV2.connect(addr).buy(0, 1, mockSOTA.address);
            expect(await sota721General.ownerOf(1)).to.equal(addr.address);

            expect((await mockSOTA.balanceOf(addr.address)).toNumber()).to.equal(999999898);
            expect((await mockSOTA.balanceOf(owner.address)).toNumber()).to.equal(85);
         });

         it("Buy 1155", async function() {
            //mint
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );

            await mockSOTA.mint(addr.address, 1000000000);
            await mockSOTA.connect(addr).approve(mockMarketV2.address, 1000000000);

            // buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
            await mockMarketV2.connect(addr).buy(0, 10, mockSOTA.address);
            expect((await nft150.balanceOf(addr.address, 1)).toNumber()).to.equal(10);
         });


         it("createBid 721", async function() {
            //mint
             //mint
            await sota721General.create('urltest', 100);
            await sota721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await sota721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            let orderId = await mockMarketV2.createOrder(
                sota721General.address,
                owner.address,
                mockSOTA.address,
                1,
                1,
                100,
                10
            );

//            createBid(
//                address _tokenAddress,
//                address _paymentToken, // payment method
//                uint256 _tokenId,
//                uint256 _quantity, // total amount want to buy
//                uint256 _price, // price of 1 nft
//                uint256 _expTime
//            )
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(0);
            await mockMarketV2.createBid(
                sota721General.address,
                mockSOTA.address,
                1,
                1,
                100,
                3 //days
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);

         });

         it("createBid 1155", async function() {
            //mint
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);
            expect((await nft150.balanceOf(mockMarketV2.address, 1)).toNumber()).to.equal(50);

            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(0);
            await mockMarketV2.createBid(
                nft150.address,
                mockSOTA.address,
                1,
                1,
                30,
                3 //days
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);

         });

        it("acceptBid 721", async function() {
            //mint
            await sota721General.create('urltest', 100);
            await sota721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await sota721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            await mockMarketV2.createOrder(
                sota721General.address,
                owner.address,
                mockSOTA.address,
                1,
                1,
                100, //prime
                10
            );

            //            createBid(
            //                address _tokenAddress,
            //                address _paymentToken, // payment method
            //                uint256 _tokenId,
            //                uint256 _quantity, // total amount want to buy
            //                uint256 _price, // price of 1 nft
            //                uint256 _expTime
            //            )
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(0);

            await mockMarketV2.connect(addr).createBid(
                sota721General.address,
                mockSOTA.address,
                1,
                1,
                20,
                3 //days
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);

            await mockSOTA.mint(addr.address, 1000000000);
            await mockSOTA.connect(addr).approve(mockMarketV2.address, 1000000000);

             await mockMarketV2.acceptBid(
                0, //bỉdid
                1 //quality
            );
            expect((await mockSOTA.balanceOf(addr.address)).toNumber()).to.equal(999999980);
            expect((await mockSOTA.balanceOf(owner.address)).toNumber()).to.equal(17);

         });

         it("cancelOrder", async function() {
            await sota721General.create('urltest', 100);
            await sota721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await sota721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            await mockMarketV2.createOrder(
                sota721General.address,
                owner.address,
                mockSOTA.address,
                1,
                1,
                100, //prime
                10
            );

            await mockMarketV2.cancelOrder(0);
            order = await mockMarketV2.mockGetOrder(0);

            expect(order.quantity.toNumber()).to.equal(0);
            expect(order.isOnsale).to.equal(false);
         });

        it("cancelBid", async function() {
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );

            await mockMarketV2.createBid(
                nft150.address,
                mockSOTA.address,
                1,
                1,
                30,
                3 //days
            );

            await mockMarketV2.cancelBid(0);
            bid = await mockMarketV2.mockGetBid(0);

            expect(bid.quantity.toNumber()).to.equal(0);
            expect(bid.status).to.equal(false);

         });

        it("updateOrder", async function() {
         //mint
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );
            //      address _tokenAddress,
            //		address _retailer,
            //		address _paymentToken, // payment method
            //		uint256 _tokenId,
            //		uint256 _quantity, // total amount for sale
            //		uint256 _price, // price of 1 nft
            //		uint256 _retailFee

            //updateOrder(
            //    uint256 _orderId,
            //    uint256 _quantity,
            //    uint256 _price,
            //    uint256 _retailFee,
            //    address _retailer
            //)
            await mockMarketV2.updateOrder(
                0,
                99,
                99,
                99,
                owner.address
            );

            let order = await mockMarketV2.mockGetOrder(0);

            expect(order.quantity.toNumber()).to.equal(99);
            expect(order.price.toNumber()).to.equal(99);
//            expect(order.retailFee.toNumber()).to.equal(99); //TODO
//            expect(order.retailer).to.equal(owner.address); //TODO

        });

        it("updateBid", async function() {
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                owner.address,
                mockSOTA.address,
                1,
                50,
                100,
                10
            );

            await mockMarketV2.createBid(
                nft150.address,
                mockSOTA.address,
                1,
                1,
                30,
                3 //days
            );

            //function updateBid(
            //uint256 _bidId,
            //uint256 _quantity,
            //uint256 _bidPrice
            //)
            await mockMarketV2.updateBid(0, 9, 9);

            let bid = await mockMarketV2.mockGetBid(0);

            expect(bid.quantity.toNumber()).to.equal(9);
            expect(bid.bidPrice.toNumber()).to.equal(9);

         });

         //_match TODO

    });

    after(async function () {
        // todo something
    });

});
