const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
use(solidity); //to use revertedWith
const { ethers, upgrades } = require('hardhat');

const { ZERO_ADDRESS } = require('openzeppelin-test-helpers/src/constants');

describe('Unit testing - Auction', function () {
	beforeEach(async function () {
		[owner, addr, refer, toDead, treasury] = await ethers.getSigners();
		MarketV3 = await hre.ethers.getContractFactory('MarketV3');
		marketV3 = await MarketV3.deploy();
		await marketV3.deployed();

		AuctionV3 = await hre.ethers.getContractFactory('AuctionV3');
		auctionV3 = await upgrades.deployProxy(AuctionV3, []);
		await auctionV3.deployed();

		MockPOLKA = await hre.ethers.getContractFactory('MockPolka');
		mockPOLKA = await MockPOLKA.deploy();
		await mockPOLKA.deployed();

		PolkaURI = await hre.ethers.getContractFactory('PolkaURI');
		polkaURI = await PolkaURI.deploy('https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/');
		await polkaURI.deployed();

		//PolkaReferral
		PolkaReferral = await hre.ethers.getContractFactory('PolkaReferral');
		polkaReferral = await PolkaReferral.deploy();
		await polkaReferral.deployed();

		Polka721General = await hre.ethers.getContractFactory('Polka721General');
		polka721General = await Polka721General.deploy(polkaURI.address);
		await polka721General.deployed();

		//random imported erc721

		Import721 = await hre.ethers.getContractFactory('Import721');
		import721 = await Import721.deploy();
		await import721.deployed();

		await auctionV3.setPaymentMethod(mockPOLKA.address, true);
		await auctionV3.setPaymentMethod(ZERO_ADDRESS, true);

		//create _tokenId 1
		await polka721General.create('urltest', 100, 250);
		await polka721General.setApprovalForAll(auctionV3.address, true);

		await import721.safeMint(owner.address); // id:0
		await import721.setApprovalForAll(auctionV3.address, true);

		await mockPOLKA.mint(addr.address, 1000000000000);
		await mockPOLKA.mint(refer.address, 1000000000000);
		await mockPOLKA.connect(addr).approve(auctionV3.address, 1000000000000);
		await mockPOLKA.connect(refer).approve(auctionV3.address, 1000000000000);
	});

	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await auctionV3.owner()).to.equal(owner.address);
		});

		it('Should upgrade the contract', async function () {
			const UpgradedAuction = await ethers.getContractFactory('AuctionTestUpgrade');
			const uAuction = await upgrades.upgradeProxy(auctionV3.address, UpgradedAuction);
			expect(await uAuction.isUpgraded()).to.be.true;
			expect((await uAuction.value()).toNumber()).to.be.equal(0);
			await uAuction.setValue(1);
			expect((await uAuction.value()).toNumber()).to.be.equal(1);

			const UpgradedAuction2 = await ethers.getContractFactory('AuctionTestUpgrade2');
			const uAuction2 = await upgrades.upgradeProxy(auctionV3.address, UpgradedAuction2);

			expect(await uAuction2.isUpgraded()).to.be.true;
			expect(await uAuction2.isUpgradedTwice()).to.be.true;
			expect((await uAuction2.value()).toNumber()).to.be.equal(1);
		});
	});

	describe('Auction 721', () => {
		it('Create Auction 721', async () => {
			Import1155 = await hre.ethers.getContractFactory('Import1155');
			import1155 = await Import1155.deploy();
			await import1155.deployed();
			await import1155.mint(owner.address, 1, 100, '0x');

			expect((await polka721General.getXUserFee(1)).toNumber()).to.equal(250);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(0);

			let now = Math.ceil(new Date().getTime() / 1000);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _startPrice,
			// uint256 _reservePrice,
			// uint256 _startTime,
			// uint256 _endTime,

			await auctionV3.pause();

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, now, now + 86400)
			).to.be.reverted;

			await auctionV3.unPause();

			await expect(auctionV3.createAuction(import1155.address, mockPOLKA.address, 1, 100, 200, now, now + 86400))
				.to.be.reverted;

			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, now, now + 86400);

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, now, now + 86400)
			).to.be.revertedWith('Not-owner');

			await expect(
				auctionV3.createAuction(polka721General.address, owner.address, 1, 100, 200, now, now + 86400)
			).to.be.revertedWith('Payment-not-support');

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 200, 100, now, now + 86400)
			).to.be.revertedWith('Price-invalid');

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 2, 1)
			).to.be.revertedWith('Time-invalid');

			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(1);

			expect(await polka721General.ownerOf(1)).to.equal(auctionV3.address);
		});

		it('Cancel Auction 721', async function () {
			await auctionV3.createAuction(
				polka721General.address,
				mockPOLKA.address,
				1,
				100,
				200,
				8999999999,
				9999999999
			);

			await expect(auctionV3.connect(addr).cancelAuction(0)).to.be.revertedWith('Auction-not-owner');

			expect(await polka721General.ownerOf(1)).to.equal(auctionV3.address);

			await auctionV3.cancelAuction(0);

			await expect(auctionV3.cancelAuction(0)).to.be.reverted;

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
		});

		it('Create bid 721 token', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _auctionId,
			// uint256 _price,

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08)
			).to.be.revertedWith('Incorrect-payment-method');

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);
			const [bidder] = await auctionV3.bidAuctions(0);

			expect(bidder).to.equal(addr.address);

			expect(
				auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 10)
			).to.be.revertedWith('Price-lower-than-start-price');

			expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 200)
			).to.be.revertedWith('User-joined-auction');

			expect(auctionV3.bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 200)).to.be.revertedWith(
				'Owner-can-not-bid'
			);
		});

		it('Create Bid 721 ETH', async function () {
			await auctionV3.createAuction(polka721General.address, ZERO_ADDRESS, 1, 100, 200, 1, 9999999999);

			await expect(
				auctionV3
					.connect(addr)
					.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08, { value: 10 })
			).to.be.revertedWith('Invalid-amount');

			await expect(
				auctionV3
					.connect(addr)
					.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08, { value: 0 })
			).to.be.revertedWith('Invalid-amount');

			await auctionV3
				.connect(addr)
				.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08, { value: 100 * 1.08 });
			const [bidder] = await auctionV3.bidAuctions(0);

			expect(bidder).to.equal(addr.address);

			expect(
				auctionV3.connect(refer).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 10, { value: 10 })
			).to.be.revertedWith('Price-lower-than-start-price');
		});

		it('Edit Bid 721', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999);
			await expect(auctionV3.connect(addr).editBidAuction(0, 150)).to.be.reverted;

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _auctionId,
			// uint256 _price,
			// uint256 _version
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);

			await auctionV3.connect(addr).editBidAuction(0, 200);

			await expect(auctionV3.editBidAuction(0, 200)).to.be.reverted;
			await expect(auctionV3.connect(addr).editBidAuction(1, 150)).to.be.reverted;

			const [, , , , , bidPrice] = await auctionV3.bidAuctions(1);
			expect(bidPrice.toNumber()).to.equal(200);
			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 400);
			await auctionV3.connect(addr).editBidAuction(1, 500);

			await auctionV3.connect(refer).cancelBidAuction(2);
			await expect(auctionV3.connect(refer).editBidAuction(2, 2000)).to.be.revertedWith('Bid-cancelled');
		});

		it('Cancel Bid 721', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 100, 1, 9999999999);

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);

			await expect(auctionV3.connect(addr).cancelBidAuction(0)).to.be.reverted;

			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 110);

			await expect(auctionV3.cancelBidAuction(0)).to.be.revertedWith('Not-owner-bid-auction');

			await auctionV3.connect(addr).cancelBidAuction(0);

			const [, , , , , , status] = await auctionV3.bidAuctions(0);

			expect(status).to.be.false;

			await expect(auctionV3.connect(addr).cancelBidAuction(0)).to.be.revertedWith('Bid-closed');

			await expect(auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 120)).to
				.not.be.reverted;
		});

		it('Cancel Bid 721 ETH', async function () {
			await auctionV3.createAuction(polka721General.address, ZERO_ADDRESS, 1, 100, 200, 1, 9999999999);

			await auctionV3
				.connect(addr)
				.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08, { value: 108 });

			await auctionV3.connect(refer).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 110, { value: 110 });

			await expect(auctionV3.cancelBidAuction(0)).to.be.revertedWith('Not-owner-bid-auction');

			await auctionV3.connect(addr).cancelBidAuction(0);

			const [, , , , , , status] = await auctionV3.bidAuctions(0);

			expect(status).to.be.false;
		});

		it('After Auction 721 No Winner', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);
			await expect(auctionV3.cancelAuction(0)).to.be.reverted;
			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 99)
			).to.be.revertedWith('Price-lower-than-start-price');
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);
			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 150 * 1.08);

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).claimWinnerAuction(1)).to.be.revertedWith('Not-winner');
			await expect(auctionV3.connect(refer).claimWinnerAuction(1)).to.be.revertedWith('Reserve-price-not-met');
			await expect(auctionV3.connect(refer).claimWinnerAuction(0)).to.be.revertedWith('Not-highest-bid');
			await expect(auctionV3.acceptBidAuction(0)).to.be.revertedWith('Not-highest-bid');
			await expect(auctionV3.acceptBidAuction(1)).to.be.revertedWith('Reserve-price-not-met');
			await expect(auctionV3.connect(refer).acceptBidAuction(1)).to.be.revertedWith('Auction-not-owner');

			await auctionV3.reclaimAuction(0);

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
		});

		it('After Auction 721 Winner', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 99)
			).to.be.revertedWith('Price-lower-than-start-price');
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 110); //0
			await expect(auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 109)).to
				.be.reverted;
			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 250); //1

			await auctionV3.connect(addr).editBidAuction(0, 3105); //2
			await auctionV3.connect(refer).cancelBidAuction(1);

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.be.reverted;
			await expect(auctionV3.connect(refer).claimWinnerAuction(1)).to.be.reverted;

			await expect(auctionV3.acceptBidAuction(2)).to.be.reverted;

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(refer).claimWinnerAuction(1)).to.be.reverted;

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.not.be.reverted;
			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.be.reverted;

			await expect(auctionV3.connect(addr).editBidAuction(2, 5000)).to.be.reverted;

			await expect(auctionV3.acceptBidAuction(2)).to.not.be.reverted;
			await expect(auctionV3.acceptBidAuction(2)).to.be.reverted;

			await expect(auctionV3.acceptBidAuction(2)).to.be.reverted;

			await auctionV3.withdrawSystemFee(mockPOLKA.address, treasury.address);

			expect((await mockPOLKA.balanceOf(treasury.address)).toNumber()).to.equal(3000 * 0.025);

			await expect(auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 5000000))
				.to.be.reverted;

			await network.provider.send('evm_increaseTime', [900000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 5000000))
				.to.be.reverted;

			expect(await polka721General.ownerOf(1)).to.equal(addr.address);
		});

		it('After Auction 721 Import', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(import721.address, mockPOLKA.address, 0, 100, 200, 1, now + 86400);

			await expect(
				auctionV3.connect(addr).bidAuction(import721.address, mockPOLKA.address, 0, 0, 99)
			).to.be.revertedWith('Price-lower-than-start-price');
			await auctionV3.connect(addr).bidAuction(import721.address, mockPOLKA.address, 0, 0, 110);
			await auctionV3.connect(refer).bidAuction(import721.address, mockPOLKA.address, 0, 0, 250);

			await auctionV3.connect(addr).editBidAuction(0, 3000);
			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.not.be.reverted;
			await expect(auctionV3.acceptBidAuction(2)).to.not.be.reverted;
			await auctionV3.withdrawSystemFee(mockPOLKA.address, treasury.address);

			expect((await mockPOLKA.balanceOf(treasury.address)).toNumber()).to.equal(0);

			expect(await import721.ownerOf(0)).to.equal(addr.address);
		});

		it('After Auction 721 Winner ETH', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, ZERO_ADDRESS, 1, 100, 200, 1, now + 86400);

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 99, { value: 99 })
			).to.be.revertedWith('Price-lower-than-start-price');

			await auctionV3
				.connect(addr)
				.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100 * 1.08, { value: 100 * 1.08 });
			await auctionV3.connect(refer).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 250, { value: 250 });

			await expect(auctionV3.connect(addr).editBidAuction(0, 300, { value: 0 })).to.be.reverted;

			await auctionV3.connect(addr).editBidAuction(0, 300, { value: 200 });

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.not.be.reverted;
			await expect(auctionV3.acceptBidAuction(2)).to.not.be.reverted;

			await expect(auctionV3.withdrawSystemFee(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.reverted;

			await auctionV3.withdrawSystemFee(ZERO_ADDRESS, treasury.address);

			expect(await polka721General.ownerOf(1)).to.equal(addr.address);
		});

		it('After Auction 721 No Winner - no bid', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);

			await expect(auctionV3.reclaimAuction(0)).to.be.reverted;

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).reclaimAuction(0)).to.be.reverted;

			await auctionV3.reclaimAuction(0);

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
		});

		it('After Auction 721 No Winner - have bid', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 500);

			await expect(auctionV3.reclaimAuction(0)).to.be.reverted;

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.reclaimAuction(0)).to.be.reverted;

			await expect(auctionV3.connect(addr).editBidAuction(0, 1000)).to.be.reverted;
		});

		it('After Auction 721 No Winner cancelled', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(
				polka721General.address,
				mockPOLKA.address,
				1,
				100,
				200,
				now + 1000,
				now + 86400
			);

			await auctionV3.cancelAuction(0);

			await network.provider.send('evm_increaseTime', [1000]);
			await network.provider.send('evm_mine');

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08)
			).to.be.revertedWith('Auction-closed');

			await expect(auctionV3.reclaimAuction(0)).to.be.reverted;

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.reclaimAuction(0)).to.be.reverted;
		});
		it('Should withdraw all funds', async function () {
			await mockPOLKA.mint(addr.address, 1000000);

			await mockPOLKA.connect(addr).transfer(auctionV3.address, 1000);

			await addr.sendTransaction({ to: auctionV3.address, value: 10000 });

			expect((await ethers.provider.getBalance(auctionV3.address)).toNumber()).to.equal(10000);

			await auctionV3.pause();

			await auctionV3.withdrawFunds(owner.address, mockPOLKA.address);

			await auctionV3.withdrawFunds(owner.address, ZERO_ADDRESS);

			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(1000);

			expect((await ethers.provider.getBalance(auctionV3.address)).toNumber()).to.equal(0);
		});
	});
});
