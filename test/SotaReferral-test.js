const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - SotaReferral", function() {
    let sotaReferral;

    beforeEach(async function () {
        [owner, addr, addr1, addr2] = await ethers.getSigners();

        const SOTAReferral = await ethers.getContractFactory("SOTAReferral");
        sotaReferral = await SOTAReferral.deploy();
        sotaReferral.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sotaReferral.owner()).to.equal(owner.address);
        });
    });
    describe("Transactions setReferral", function () {
        it("Contractor", async function () {
            await sotaReferral.setReferral([owner.address, addr.address], [addr1.address, addr2.address]);

            expect(await sotaReferral.getReferral(owner.address)).to.equal(addr1.address);
            expect(await sotaReferral.getReferral(addr.address)).to.equal(addr2.address);
        });
    });
    after(async function () {
        // todo something
    });

});
