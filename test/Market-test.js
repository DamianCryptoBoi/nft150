const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith


describe("Unit testing - Market", function() {
    let mockMarketV2;
    let nft150;
    let polka721General;
    let polkaReferral;

    beforeEach(async function () {
        [owner, addr, refer, toDead] = await ethers.getSigners();
        MockMarketV2 = await hre.ethers.getContractFactory("MockMarketV2");
        mockMarketV2 = await MockMarketV2.deploy();
        await mockMarketV2.deployed();

        MockPOLKA = await hre.ethers.getContractFactory("MockPolka");
        mockPOLKA = await MockPOLKA.deploy();
        await mockPOLKA.deployed();

        PolkaURI = await hre.ethers.getContractFactory("PolkaURI");
        polkaURI = await PolkaURI.deploy("https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/");
        await polkaURI.deployed();

        Polka721General = await hre.ethers.getContractFactory("Polka721General");
        polka721General = await Polka721General.deploy(polkaURI.address);
        await polka721General.deployed();

        NFT150 = await hre.ethers.getContractFactory("NFT150");
        nft150 = await NFT150.deploy(polkaURI.address);
        await nft150.deployed();

        //PolkaReferral
        PolkaReferral = await hre.ethers.getContractFactory("PolkaReferral");
        polkaReferral = await PolkaReferral.deploy();
        await polkaReferral.deployed();

        await mockMarketV2.setReferralContract(polkaReferral.address);

        await mockMarketV2.setPaymentMethod(mockPOLKA.address, true);
        await mockMarketV2.addPOLKANFTs(polka721General.address, true, true);
        await mockMarketV2.addPOLKANFTs(nft150.address, true, false);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await mockMarketV2.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
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
            await mockMarketV2.setSystemFee(
                9999,
                9999,
                9999,
                9999);

            expect((await mockMarketV2.mockGetxUser()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetxCreator()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetyRefRate()).toNumber()).to.equal(9999);
            expect((await mockMarketV2.mockGetzProfitToCreator()).toNumber()).to.equal(9999);

            //restore value
            await mockMarketV2.setSystemFee(
                250,
                1500,
                5000,
                5000
                );
        });

         it("setPaymentMethod", async function() {
            expect(await mockMarketV2.mockPaymentMethod(mockPOLKA.address)).to.be.true;

            // 2**256 - 1 to HEX or 115792089237316195423570985008687907853269984665640564039457584007913129639935
            expect((await mockPOLKA.allowance(mockMarketV2.address , owner.address)).toHexString()).to.equal(
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
            await polka721General.create('urltest', 100, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);

            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //create _tokenId 1
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                1,
                1
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);

            expect(await polka721General.ownerOf(1)).to.equal(mockMarketV2.address);

         });

         it("createOrder new 1155", async function() {
            //        uint256 _maxSupply,
            //        uint256 _initialSupply,
            //        uint256 _loyaltyFee,
            //        string memory _uri,
            //        bytes memory _data
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);
            expect((await nft150.balanceOf(mockMarketV2.address, 1)).toNumber()).to.equal(1);
         });

         it("Buy 721", async function() {
            await polkaReferral.setReferral([addr.address], [refer.address]);

            //mint
            await polka721General.create('urltest', 2000, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            let orderId = await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                1,
                1
            );

            //            buy(
            //                uint256 _orderId,
            //                uint256 _quantity,
            //                address _paymentToken
            //            )
            await mockPOLKA.mint(addr.address, 1000000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000000);

            await mockMarketV2.connect(addr).buy(0, 1, mockPOLKA.address, 1);
            expect(await polka721General.ownerOf(1)).to.equal(addr.address);

            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000000 - 10000 - 10000 * 0.025 - 10000 * 0.2);
            expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
            expect((await mockPOLKA.balanceOf(refer.address)).toNumber()).to.equal(Math.floor(10000 * 0.025 * 0.5));
         });

         it("Buy 1155", async function() {
            //mint
            await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);


            // buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
            await mockMarketV2.connect(addr).buy(0, 1, mockPOLKA.address, 1);
            expect((await nft150.balanceOf(addr.address, 1)).toNumber()).to.equal(1);

            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 10000 - 10000 * 0.025 - 10000 * 0.2);
            expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
         });




         it("createBid 721", async function() {
            //mint
             //mint
            await polka721General.create('urltest', 100, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            let orderId = await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);
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
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100,
                3, //days
                1
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);

         });

         it("createBid 1155", async function() {
            //mint
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(1);
            expect((await nft150.balanceOf(mockMarketV2.address, 1)).toNumber()).to.equal(1);

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(0);
            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                30,
                3, //days
                1
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);

         });

        it("acceptBid 721", async function() {
            //mint
            await polka721General.create('urltest', 2000, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                10000, //prime
                1,
                1
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

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            await mockMarketV2.connect(addr).createBid(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                3, //days
                1
            );
            expect((await mockMarketV2.mockTotalBids()).toNumber()).to.equal(1);


             await mockMarketV2.acceptBid(
                0, //bỉdid
                1 //quality
            );
            let amontNotFee = Math.floor(10000 /(1 + 0.025 + 0.2));

            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 10000);
            expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(amontNotFee + Math.floor((amontNotFee * 0.2)));

         });

         it("cancelOrder", async function() {
            await polka721General.create('urltest', 100, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100, //prime
                1,
                1
            );

            await mockMarketV2.cancelOrder(0, 1);
            order = await mockMarketV2.mockGetOrder(0);

            expect(order.quantity.toNumber()).to.equal(0);
            expect(order.isOnsale).to.equal(false);
         });

        it("Cancel order 1155 success", async function() {
            //mint
            await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            // buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
            expect(await nft150.nftOnSaleVersion(1,1)).to.equal(true);
            await mockMarketV2.cancelOrder(0, 1);
            expect(await nft150.nftOnSaleVersion(1,1)).to.equal(false);
         });

         it("Cancel order 1155 revert", async function() {
            //mint
            await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                10000,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            // buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
            await mockMarketV2.connect(addr).buy(0, 1, mockPOLKA.address, 1);
            await expect(mockMarketV2.cancelOrder(0, 1)).to.be.revertedWith("Version-not-on-sale");
         });

        it("cancelBid", async function() {
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                30,
                3, //days
                1
            );

            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);

            await mockMarketV2.connect(addr).cancelBid(0);
            bid = await mockMarketV2.mockGetBid(0);

            expect(bid.quantity.toNumber()).to.equal(0);
            expect(bid.status).to.equal(false);
            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000);

         });

         it("cancelBid 1155 revert ", async function() {
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                30,
                3, //days
                1
            );

            expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);
            await mockMarketV2.acceptBid(
                0, //bỉdid
                1 //quality
            );
            await expect(mockMarketV2.connect(addr).cancelBid(0)).to.be.revertedWith("Invalid-bidder");

         });

         it("burn 721", async function() {
            await polka721General.create('urltest', 100, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100, //prime
                1,
                1
            );

            //createOrder
            await mockMarketV2.burnVersion(
                polka721General.address,
                toDead.address,
                1,
                1
            );

            expect(await polka721General.ownerOf(1)).to.equal(toDead.address);

         });

         it("burn 1155", async function() {
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            //createOrder
            await mockMarketV2.burnVersion(
                nft150.address,
                toDead.address,
                1,
                1
            );

            expect((await nft150.balanceOf(toDead.address, 1)).toNumber()).to.equal(1);

         });

        it("updateOrder", async function() {
         //mint
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
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
                owner.address,
                1
            );

            let order = await mockMarketV2.mockGetOrder(0);

            expect(order.quantity.toNumber()).to.equal(99);
            expect(order.price.toNumber()).to.equal(99);
//            expect(order.retailFee.toNumber()).to.equal(99); //TODO
//            expect(order.retailer).to.equal(owner.address); //TODO

        });

        it("updateBid", async function() {
             //mint
            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);
            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                30,
                3, //days
                1
            );

            //function updateBid(
            //uint256 _bidId,
            //uint256 _quantity,
            //uint256 _bidPrice
            //)
            await mockMarketV2.connect(addr).updateBid(0, 9, 9);

            let bid = await mockMarketV2.mockGetBid(0);

            expect(bid.quantity.toNumber()).to.equal(9);
            expect(bid.bidPrice.toNumber()).to.equal(9);

        });

         //_match TODO
        it("adminMigrateData", async function() {

            await nft150.create(1000, 100, 200, '_uritest', 1, 250);
            await nft150.setApprovalForAll(mockMarketV2.address, true);

            expect((await mockMarketV2.mockTotalOrders()).toNumber()).to.equal(0);
            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                200,
                1,
                1
            );

            await mockMarketV2.createOrder(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                200,
                1,
                1
            );

            await mockPOLKA.mint(addr.address, 1000000);
            await mockPOLKA.connect(addr).approve(mockMarketV2.address, 1000000);

            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                30,
                3,
                1
            );

            await mockMarketV2.connect(addr).createBid(
                nft150.address,
                mockPOLKA.address,
                1,
                1,
                40,
                3,
                1
            );

            //721
            await polka721General.create('urltest', 100, 250);
            await polka721General.setApprovalForAll(mockMarketV2.address, true);
            expect(await polka721General.ownerOf(1)).to.equal(owner.address);

            //createOrder
            let orderId = await mockMarketV2.createOrder(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100,
                1,
                1
            );

            await mockMarketV2.connect(addr).createBid(
                polka721General.address,
                mockPOLKA.address,
                1,
                1,
                100,
                3,
                1
            );

            MockMarketV2New = await hre.ethers.getContractFactory("MockMarketV2");
            mockMarketV2New = await MockMarketV2.deploy();
            await mockMarketV2New.deployed();

//            await mockMarketV2.setApproveForAll(nft150.address, mockMarketV2New.address);  //need for Deploy
//            await mockMarketV2.setApproveForAllERC721(polka721General.address, mockMarketV2New.address); //need for Deploy

            await mockMarketV2New.adminMigrateOrders(mockMarketV2.address);
            await mockMarketV2.adminMigratePushNFT(mockMarketV2New.address);
            await mockMarketV2New.adminMigrateBids(mockMarketV2.address);

            expect((await mockMarketV2New.mockTotalOrders()).toNumber()).to.equal(3);
            expect((await mockMarketV2New.mockTotalBids()).toNumber()).to.equal(3);

            expect(await polka721General.ownerOf(1)).to.equal(mockMarketV2New.address);
            expect((await nft150.balanceOf(mockMarketV2New.address, 1)).toNumber()).to.equal(2);

        });
    });

    after(async function () {
        // todo something
    });

});
