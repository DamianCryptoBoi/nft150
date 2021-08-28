const { expect } = require("chai");

describe("Unit testing - Polka721General", function() {
    let polka721General;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        Polka721General = await hre.ethers.getContractFactory("Polka721General");
        polka721General = await Polka721General.deploy();
        await polka721General.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await polka721General.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
            expect(await polka721General.name()).to.equal("Sota Platform ERC721 NFTs"); //TODO

            expect(await polka721General.symbol()).to.equal("SOTA721GENERAL"); //TODO
        });
    });
    describe("Transactions", function () {
        it("Create New NFT", async function() {
            await polka721General.create('urltest', 100);

            expect(await polka721General.getCreator(1)).to.equal(owner.address);
            expect( (await polka721General.getLoyaltyFee(1)).toNumber()).to.equal(100);

            expect(await polka721General.getCreator(1)).to.equal(owner.address);

            expect(await polka721General.tokenURI(1)).to.equal('https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/urltest'); //TODO

            await polka721General.setBaseURI('https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/change/');
            expect(await polka721General.tokenURI(1)).to.equal('https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/change/urltest'); //TODO
        });
    });

    after(async function () {

    });

});
