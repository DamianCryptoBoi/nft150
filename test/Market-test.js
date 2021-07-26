const { expect, assert } = require("chai");

describe("Unit testing - Market", function() {
    let mockMarketV2;

    beforeEach(async function () {
        [owner, addr] = await ethers.getSigners();
//        SotaMarketV2 = await hre.ethers.getContractFactory("SotaMarketV2");
        MockMarketV2 = await hre.ethers.getContractFactory("MockMarketV2");
        mockMarketV2 = await MockMarketV2.deploy();
        await mockMarketV2.deployed();

        MockSOTA = await hre.ethers.getContractFactory("MockSOTA");
        mockSOTA = await MockSOTA.deploy();
        await mockSOTA.deployed();
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
          (await mockSOTA.allowance(mockMarketV2.address , owner.address)).toHexString());
            expect(await mockMarketV2.mockPaymentMethod(mockSOTA.address)).to.be.true

            // 2**256 - 1 to HEX or 115792089237316195423570985008687907853269984665640564039457584007913129639935
            expect((await mockSOTA.allowance(mockMarketV2.address , owner.address)).toHexString()).to.equal(
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
         });

         //withdrawFunds => only admin call - onlyOwner => don`t unit test


    });

    after(async function () {

    });

});
