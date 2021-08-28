const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - ProfitEstimator", function() {
    let mockPolkaExchange;
    let mockMarketV2;
    let polka721General;
    let mockPolka;

    beforeEach(async function () {
        [owner, addr, addr2] = await ethers.getSigners();

        const MockPolkaExchange = await ethers.getContractFactory("MockPolkaExchange");
        mockPolkaExchange = await MockPolkaExchange.deploy();
        await mockPolkaExchange.deployed();

        const MockPolka = await hre.ethers.getContractFactory("MockPolka");
        mockPolka = await MockPolka.deploy();
        await mockPolka.deployed();

        const MockMarketV2 = await hre.ethers.getContractFactory("MockMarketV2");
        mockMarketV2 = await MockMarketV2.deploy();
        await mockMarketV2.deployed();

        const Polka721General = await ethers.getContractFactory("Polka721General");
        polka721General = await Polka721General.deploy();
        await polka721General.deployed();

        const ProfitEstimator = await ethers.getContractFactory("ProfitEstimator");
        profitEstimator = await ProfitEstimator.deploy(mockMarketV2.address, mockPolkaExchange.address);
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

            await polka721General.create('urltest', 100);
            await expect(profitEstimator.profitToCreator(
                polka721General.address,
                mockPolka.address,
                1,
                1,
                3000,
                150
            )).to.be.revertedWith("Invalid-sender");

            await expect(mockMarketV2.mockProfitToCreator(
                profitEstimator.address,
                polka721General.address,
                mockPolka.address,
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
