const { expect, assert, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);  //to user revertedWith

describe("Unit testing - Market", function() {
    let bSotaToken;

    beforeEach(async function () {
        [owner, addr, addr2] = await ethers.getSigners();
        const BSotaToken = await ethers.getContractFactory("BSotaToken");
        bSotaToken = await BSotaToken.deploy();
        bSotaToken.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await bSotaToken.owner()).to.equal(owner.address);
        });

        it("Contractor", async function () {
            expect(await bSotaToken.name()).to.equal("SOTA");
            expect(await bSotaToken.symbol()).to.equal("SOTA");
        });
    });
    describe("Transactions", function () {
        it("modifier onlyWhiteList", async function () {
            await expect(bSotaToken.connect(addr).mint(owner.address, 1000)).to.be.revertedWith("Only-whitelist-minter");
            await expect(bSotaToken.mint(owner.address, 1000));
            expect(await bSotaToken.balanceOf(owner.address)).to.equal(1000);

            await bSotaToken.adminWhiteList(addr.address, true); // not reverted
            await bSotaToken.connect(addr).mint(addr.address, 2000);
            expect(await bSotaToken.balanceOf(addr.address)).to.equal(2000);

        });

        it("swap and adminWithdrawFee", async function () {
            //case reverted
            await expect(bSotaToken.swap(addr.address, 9)).to.be.revertedWith("Invalid-amount");
            // feeCollected = feeCollected.add(FEE);
            // _burn(msg.sender, swapAmount);
            // _transfer(msg.sender, address(this), FEE);
            await expect(bSotaToken.mint(owner.address, 1000));
            await expect(bSotaToken.swap(addr.address, 100))
                .to.emit(bSotaToken, 'Swap')
                .withArgs(owner.address, addr.address, 90);

            await bSotaToken.adminWithdrawFee(addr2.address);

            expect(await bSotaToken.balanceOf(owner.address)).to.equal(900);
            expect(await bSotaToken.balanceOf(addr2.address)).to.equal(10);

        });
    });

    after(async function () {
        // todo something
    });

});
