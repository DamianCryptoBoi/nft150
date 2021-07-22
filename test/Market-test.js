const { expect } = require("chai");

describe("Unit testing - Market", function() {
    let sota721General;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        SotaMarketV2 = await hre.ethers.getContractFactory("SotaMarketV2");
        sotaMarketV2 = await SotaMarketV2.deploy("0x46b9d3509fdbdd8726e296ab2fa5044c443c26b0");
        await sotaMarketV2.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sotaMarketV2.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
//            expect(await sotaMarketV2.name()).to.equal("Sota Platform ERC721 NFTs"); //TODO
//
//            expect(await sotaMarketV2.symbol()).to.equal("SOTA721GENERAL"); //TODO
        });
    });
    describe("Transactions", function () {
        it("Create New NFT", async function() {

        });
    });

    after(async function () {

    });

});
