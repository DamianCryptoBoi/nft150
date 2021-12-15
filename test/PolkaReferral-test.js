// const { expect, assert, use } = require('chai');
// const { solidity } = require('ethereum-waffle');
// use(solidity); //to user revertedWith

// describe('Unit testing - PolkaReferral', function () {
// 	let polkaReferral;

// 	beforeEach(async function () {
// 		[owner, addr, addr1, addr2] = await ethers.getSigners();

// 		const PolkaReferral = await ethers.getContractFactory('PolkaReferral');
// 		polkaReferral = await PolkaReferral.deploy();
// 		polkaReferral.deployed();
// 	});

// 	describe('Deployment', function () {
// 		it('Should set the right owner', async function () {
// 			expect(await polkaReferral.owner()).to.equal(owner.address);
// 		});
// 	});
// 	describe('Transactions setReferral', function () {
// 		it('Contractor', async function () {
// 			await polkaReferral.setReferral([owner.address, addr.address], [addr1.address, addr2.address]);

// 			expect(await polkaReferral.getReferral(owner.address)).to.equal(addr1.address);
// 			expect(await polkaReferral.getReferral(addr.address)).to.equal(addr2.address);
// 		});
// 	});
// 	after(async function () {
// 		// todo something
// 	});
// });
