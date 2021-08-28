//const { expect, assert, use } = require("chai");
//const { solidity } = require("ethereum-waffle");
//use(solidity);  //to user revertedWith
//
//describe("Unit testing - BPolkaToken", function() {
//    let bPolkaToken;
//
//    beforeEach(async function () {
//        [owner, addr, addr2] = await ethers.getSigners();
//        const BPolkaToken = await ethers.getContractFactory("BPolkaToken");
//        bPolkaToken = await BPolkaToken.deploy();
//        bPolkaToken.deployed();
//    });
//
//    describe("Deployment", function () {
//        it("Should set the right owner", async function () {
//            expect(await bPolkaToken.owner()).to.equal(owner.address);
//        });
//
//        it("Contractor", async function () {
//            expect(await bPolkaToken.name()).to.equal("POLKA");
//            expect(await bPolkaToken.symbol()).to.equal("POLKA");
//        });
//    });
//    describe("Transactions", function () {
//        it("modifier onlyWhiteList", async function () {
//            await expect(bPolkaToken.connect(addr).mint(owner.address, 1000)).to.be.revertedWith("Only-whitelist-minter");
//            await expect(bPolkaToken.mint(owner.address, 1000));
//            expect(await bPolkaToken.balanceOf(owner.address)).to.equal(1000);
//
//            await bPolkaToken.adminWhiteList(addr.address, true); // not reverted
//            await bPolkaToken.connect(addr).mint(addr.address, 2000);
//            expect(await bPolkaToken.balanceOf(addr.address)).to.equal(2000);
//
//        });
//
//        it("swap and adminWithdrawFee", async function () {
//            //case reverted
//            await expect(bPolkaToken.swap(addr.address, 9)).to.be.revertedWith("Invalid-amount");
//            // feeCollected = feeCollected.add(FEE);
//            // _burn(msg.sender, swapAmount);
//            // _transfer(msg.sender, address(this), FEE);
//            await expect(bPolkaToken.mint(owner.address, 1000));
//            await expect(bPolkaToken.swap(addr.address, 100))
//                .to.emit(bPolkaToken, 'Swap')
//                .withArgs(owner.address, addr.address, 90);
//
//            await bPolkaToken.adminWithdrawFee(addr2.address);
//
//            expect(await bPolkaToken.balanceOf(owner.address)).to.equal(900);
//            expect(await bPolkaToken.balanceOf(addr2.address)).to.equal(10);
//
//        });
//    });
//
//    after(async function () {
//        // todo something
//    });
//
//});
