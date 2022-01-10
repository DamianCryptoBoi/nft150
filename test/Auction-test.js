const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
use(solidity); //to user revertedWith
const { ethers, upgrades } = require('hardhat');

const { ZERO_ADDRESS } = require('openzeppelin-test-helpers/src/constants');

describe('Unit testing - Auction', function () {
	let MarketV3;
	let marketV3;
	let nft150;
	let polka721General;

	beforeEach(async function () {
		[owner, addr, refer, toDead] = await ethers.getSigners();
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

		await auctionV3.setReferralContract(polkaReferral.address);
		await auctionV3.setPaymentMethod(mockPOLKA.address, true);
		await auctionV3.setPaymentMethod(ZERO_ADDRESS, true);
	});

	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await auctionV3.owner()).to.equal(owner.address);
		});
	});

	describe('Upgrade', function () {
		it('Should keep the changed fee when upgrade', async function () {
			await auctionV3.setSystemFee(1000);

			const AuctionV3x = await hre.ethers.getContractFactory('AuctionV3');
			const auctionV3x = await upgrades.upgradeProxy(auctionV3.address, AuctionV3x);
			await auctionV3x.deployed();

			expect((await auctionV3x.yRefRate()).toNumber()).to.equal(1000);
			await auctionV3x.setSystemFee(5000);
			expect((await auctionV3.yRefRate()).toNumber()).to.equal(5000);

			expect(auctionV3.address).to.equal(auctionV3x.address);
		});
	});

	describe('Auction 721', () => {
		beforeEach(async () => {
			Polka721General = await hre.ethers.getContractFactory('Polka721General');
			polka721General = await Polka721General.deploy(polkaURI.address);
			await polka721General.deployed();

			await marketV3.addPOLKANFTs(polka721General.address, true, false);

			await auctionV3.addPOLKANFTs(polka721General.address, true);

			//create _tokenId 1
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(auctionV3.address, true);

			await mockPOLKA.mint(addr.address, 1000000000000);
			await mockPOLKA.mint(refer.address, 1000000000000);
			await mockPOLKA.connect(addr).approve(auctionV3.address, 1000000000000);
			await mockPOLKA.connect(refer).approve(auctionV3.address, 1000000000000);
		});

		it('Create Auction 721', async () => {
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

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			await auctionV3.createAuction(
				polka721General.address,
				mockPOLKA.address,
				1,
				100,
				200,
				8999999999,
				9999999999
			);
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

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _auctionId,
			// uint256 _price,
			// uint256 _version
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);

			await auctionV3.connect(addr).editBidAuction(0, 200);

			const [, , , , , bidPrice] = await auctionV3.bidAuctions(1);
			expect(bidPrice.toNumber()).to.equal(200);
		});

		it('Cancel Bid 721', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999);

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);

			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 110);

			await expect(auctionV3.cancelBidAuction(0)).to.be.revertedWith('Not-owner-bid-auction');

			await auctionV3.connect(addr).cancelBidAuction(0);

			const [, , , , , , status] = await auctionV3.bidAuctions(0);

			expect(status).to.be.false;

			await expect(auctionV3.connect(addr).cancelBidAuction(0)).to.be.revertedWith('Bid-closed');

			await expect(auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 120)).to
				.not.be.reverted;
		});

		it('After Auction 721 No Winner', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);

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
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100 * 1.08);
			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 250 * 1.08);

			await auctionV3.connect(addr).editBidAuction(0, 300);
			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.not.be.reverted;
			await expect(auctionV3.acceptBidAuction(2)).to.not.be.reverted;

			expect(await polka721General.ownerOf(1)).to.equal(addr.address);
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

			await auctionV3.connect(addr).editBidAuction(0, 300, { value: 200 });

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await expect(auctionV3.connect(addr).claimWinnerAuction(2)).to.not.be.reverted;
			await expect(auctionV3.acceptBidAuction(2)).to.not.be.reverted;

			expect(await polka721General.ownerOf(1)).to.equal(addr.address);
		});

		it('After Auction 721 No Winner - no bid', async () => {
			const latestBlock = await hre.ethers.provider.getBlock('latest');
			const now = latestBlock.timestamp;
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, now + 86400);

			await network.provider.send('evm_increaseTime', [90000]);
			await network.provider.send('evm_mine');

			await auctionV3.reclaimAuction(0);

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
		});
	});
});
