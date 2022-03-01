const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
use(solidity); //to user revertedWith

describe('Unit testing - NFT150', function () {
	let nft150;

	beforeEach(async function () {
		[owner, addr, addr2] = await ethers.getSigners();

		PolkaURI = await hre.ethers.getContractFactory('PolkaURI');
		polkaURI = await PolkaURI.deploy('https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/');
		await polkaURI.deployed();

		const NFT150 = await ethers.getContractFactory('NFT150');
		nft150 = await NFT150.deploy(polkaURI.address);
		nft150.deployed();

		//old erc1155 with version
		NFT150Version = await hre.ethers.getContractFactory('NFT150Version');
		nft150Version = await NFT150Version.deploy(polkaURI.address);
		await nft150Version.deployed();
	});

	// describe('Deployment', function () {
	// 	it('Should set the right owner', async function () {
	// 		expect(await nft150.owner()).to.equal(owner.address);
	// 	});

	// 	it('Contractor', async function () {
	// 		expect(await nft150.name()).to.equal('NFT150 General');
	// 		expect(await nft150.symbol()).to.equal('NFT150');
	// 	});
	// });
	describe('Transactions', function () {
		// any function is open source of opensea => don't to test
		// removeWhitelistAdmin ==> remove
		// removeMinter         ==> remove
		// Create               ==> to test
		// mint                 ==> to test
		// setProxyAddress      ==> to test ==> TODO request Proxy Address
		// getCreator           ==> to test
		// getLoyaltyFee        ==> to test
		// maxSupply            ==> to test
		// totalSupply            ==> to test

		it('create - maxSupply - totalSupply - getLoyaltyFee - getCreator', async function () {
			await expect(nft150.create(1000, 1001, 200, '_uritest', 1, 250)).to.be.revertedWith(
				'Initial supply cannot be more than max supply'
			);
			await expect(nft150.create(1000, 100, 10001, '_uritest', 1, 250)).to.be.revertedWith('Invalid-loyalty-fee');
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);

			expect(await nft150.maxSupply(1)).to.equal(1000);
			expect(await nft150.totalSupply(1)).to.equal(100);
			expect(await nft150.getLoyaltyFee(1)).to.equal(200);

			await nft150.mint(owner.address, 1, 9, 1);
			expect(await nft150.totalSupply(1)).to.equal(109);

			expect(await nft150.getCreator(1)).to.equal(owner.address);
			expect(await nft150.uri(1)).to.equal(
				'https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/_uritest'
			);
			await polkaURI.adminSetBaseMetadataURI(
				'https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/change/'
			);
			expect(await nft150.uri(1)).to.equal(
				'https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/change/_uritest'
			);
		});

		it('migrate', async function () {
			await nft150Version.create(1000, 100, 200, '_uritest', 1, 250);
			expect(await nft150Version.balanceOf(owner.address, 1)).to.equal(100);

			await nft150Version.connect(addr).create(1000, 10, 200, '_uritest', 1, 250);
			expect(await nft150Version.balanceOf(addr.address, 2)).to.equal(10);

			await nft150Version.connect(addr2).create(1000, 20, 200, '_uritest', 1, 250);
			expect(await nft150Version.balanceOf(addr2.address, 3)).to.equal(20);

			await nft150.migrateDataFromV1(1, 3, nft150Version.address);

			users = [owner.address, addr.address, addr2.address];

			users.forEach(async (user) => await nft150.migrateBalancesFromV1(user, 1, 3, nft150Version.address));

			expect(await nft150.balanceOf(owner.address, 1)).to.equal(100);
			expect(await nft150.balanceOf(addr.address, 2)).to.equal(10);

			expect(await nft150.balanceOf(addr2.address, 3)).to.equal(20);
		});
	});

	after(async function () {
		// todo something
	});
});
