const { expect } = require("chai");

describe("Unit testing - Sota721General", function() {
    let sota721General;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        Sota721General = await hre.ethers.getContractFactory("Sota721General");
        sota721General = await Sota721General.deploy();
        await sota721General.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sota721General.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
            expect(await sota721General.name()).to.equal("Sota Platform ERC721 NFTs"); //TODO

            expect(await sota721General.symbol()).to.equal("SOTA721GENERAL"); //TODO
        });
    });
    describe("Transactions", function () {
        it("Create New NFT", async function() {
            await sota721General.create('urltest', 100);

            expect(await sota721General.getCreator(1)).to.equal(owner.address);
            expect( (await sota721General.getLoyaltyFee(1)).toNumber()).to.equal(100);

            expect(await sota721General.getCreator(1)).to.equal(owner.address);

            expect(await sota721General.tokenURI(1)).to.equal('https://storage.sota.finance/urltest'); //TODO

            await sota721General.setBaseURI('https://storage.sota.finance-change/');
            expect(await sota721General.tokenURI(1)).to.equal('https://storage.sota.finance-change/urltest'); //TODO
        });
    });

    after(async function () {

    });

});
