const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - ProfitEstimator", function() {
    let mockSotaExchange;
    let mockMarketV2;
    let sota721General;
    let mockSOTA;

    beforeEach(async function () {
        [owner, addr, addr2] = await ethers.getSigners();

        const MockSotaExchange = await ethers.getContractFactory("MockSotaExchange");
        mockSotaExchange = await MockSotaExchange.deploy();
        await mockSotaExchange.deployed();

        const MockSOTA = await hre.ethers.getContractFactory("MockSOTA");
        mockSOTA = await MockSOTA.deploy();
        await mockSOTA.deployed();

        const MockMarketV2 = await hre.ethers.getContractFactory("MockMarketV2");
        mockMarketV2 = await MockMarketV2.deploy();
        await mockMarketV2.deployed();

        const Sota721General = await ethers.getContractFactory("Sota721General");
        sota721General = await Sota721General.deploy();
        await sota721General.deployed();

        const ProfitEstimator = await ethers.getContractFactory("ProfitEstimator");
        profitEstimator = await ProfitEstimator.deploy(mockMarketV2.address, mockSotaExchange.address);
        profitEstimator.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await profitEstimator.owner()).to.equal(owner.address);
        });
    });
    describe("Transactions", function () {
        it("ProfitToCreator", async function () {
            // function profitToCreator(
            //     address _nft,
            //     address _paymentToken,
            //     uint256 _tokenId,
            //     uint256 _amount,
            //     uint256 _price,
            //     uint256 _lastBuyPriceInUSD
            // )

            await sota721General.create('urltest', 100);
            await expect(profitEstimator.profitToCreator(
                sota721General.address,
                mockSOTA.address,
                1,
                1,
                3000,
                150
            )).to.be.revertedWith("Invalid-sender");

            await expect(mockMarketV2.mockProfitToCreator(
                profitEstimator.address,
                sota721General.address,
                mockSOTA.address,
                1,
                1,
                3000,
                150

            )).to.emit(mockMarketV2, 'mockEventProfitToCreator').withArgs(26);

        });
    });

    after(async function () {
        // todo something
    });

});
