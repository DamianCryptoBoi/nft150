const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - SotaExchangeV2", function() {
    let sotaExchangeV2;

    let bnbRouter;
    let usdt;
    let usdtMarket;
    let busd;
    let bnb;

    let mockBSCswapRouter;

    beforeEach(async function () {
        [owner, addr, addr2] = await ethers.getSigners();

        // address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
        // address public usdt; // 0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684 => get price
        // address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 => compare with payment token market
        // address public busd; // 0x78867bbeef44f2326bf8ddd1941a4439382ef2a7
        // address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd

        const MockERCFactory = await ethers.getContractFactory("MockERC20");
        const Usdt = await ethers.getContractFactory("MockERC20");
        const UsdtMarket = await ethers.getContractFactory("MockERC20");
        const Busd = await ethers.getContractFactory("MockERC20");
        const Bnb = await ethers.getContractFactory("MockERC20");


        usdt = await Usdt.deploy();
        usdtMarket = await UsdtMarket.deploy();
        busd = await Busd.deploy();
        bnb = await Bnb.deploy();

        usdt.deployed();
        usdtMarket.deployed();
        busd.deployed();
        bnb.deployed();

        let MockBSCswapRouter = await ethers.getContractFactory("MockBSCswapRouter");
        mockBSCswapRouter = await MockBSCswapRouter.deploy();
        mockBSCswapRouter.deployed();

        const SotaExchangeV2 = await ethers.getContractFactory("SOTAExchangeV2");
        sotaExchangeV2 = await SotaExchangeV2.deploy(
            mockBSCswapRouter.address,
            usdt.address,
            busd.address,
            bnb.address
        );
        sotaExchangeV2.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sotaExchangeV2.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
        });
    });
    describe("Transactions", function () {

        it("estimateToUSDT", async function () {
            expect(await sotaExchangeV2.estimateToUSDT(busd.address, 1000)).to.be.equal(1000);
        });
        it("estimateFromUSDT", async function () {
            expect(await sotaExchangeV2.estimateFromUSDT(busd.address, 1000)).to.be.equal(1000);
        });
    });

    after(async function () {
        // todo something
    });

});
