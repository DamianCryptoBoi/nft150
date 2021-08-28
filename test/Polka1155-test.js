const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - Polka1155", function() {
    let polka1155;

    beforeEach(async function () {
        [owner, addr, addr2] = await ethers.getSigners();
        const Polka1155 = await ethers.getContractFactory("Polka1155");
        polka1155 = await Polka1155.deploy();
        polka1155.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await polka1155.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
            expect(await polka1155.name()).to.equal("POLKA1155");
            expect(await polka1155.symbol()).to.equal("POLKA1155");
        });
    });
    describe("Transactions", function () {

        // onlyWhiteListCreator
        // removeWhitelistAdmin
        // adminWhiteListCreators
        // totalSupply
        // maxSupply
        // setBaseMetadataURI
        // create
        // removeMinter         ==> remove
        // Create               ==> to test
        // mint                 ==> to test
        // setProxyAddress      ==> to test ==> TODO request Proxy Address
        // getCreator           ==> to test
        // getLoyaltyFee        ==> to test
        // maxSupply            ==> to test
        // totalSupply            ==> to test


        it("create - maxSupply - totalSupply - getLoyaltyFee - getCreator", async function () {
            await expect(polka1155.create(1000, 1001, 200, '_uritest', 1)).to.be.revertedWith("Initial supply cannot be more than max supply");
            await expect(polka1155.create(1000, 100, 10001, '_uritest', 1)).to.be.revertedWith("Invalid-loyalty-fee");

            // Only-white-list-can-create
            await expect(polka1155.connect(addr).create(1000, 100, 10001, '_uritest', 1)).to.be.revertedWith("Only-white-list-can-create");

            await polka1155.create(1000, 100, 200, '_uritest', 1);


            expect(await polka1155.maxSupply(1)).to.equal(1000);
            expect(await polka1155.totalSupply(1)).to.equal(100);
            expect(await polka1155.getLoyaltyFee(1)).to.equal(200);

            await polka1155.mint(owner.address, 1, 9, 1);
            expect(await polka1155.totalSupply(1)).to.equal(109);

            expect(await polka1155.getCreator(1)).to.equal(owner.address);
        });
    });

    after(async function () {
        // todo something
    });

});
