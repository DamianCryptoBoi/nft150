const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const { BigNumber } = require('ethers');
const { ZERO_ADDRESS } = require('openzeppelin-test-helpers/src/constants');
use(solidity); //to user revertedWith

describe('Unit testing - Auction', function () {
	let MarketV3;
	let marketV3;
	let nft150;
	let polka721General;
	let polkaReferral;

	beforeEach(async function () {
		[owner, addr, refer, toDead] = await ethers.getSigners();
		MarketV3 = await hre.ethers.getContractFactory('MarketV3');
		marketV3 = await MarketV3.deploy();
		await marketV3.deployed();

		AuctionV3 = await hre.ethers.getContractFactory('AuctionV3');
		auctionV3 = await AuctionV3.deploy();
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

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.mint(refer.address, 1000000);
			await mockPOLKA.connect(addr).approve(auctionV3.address, 1000000);
			await mockPOLKA.connect(refer).approve(auctionV3.address, 1000000);
		});

		it('Create Auction 721', async () => {
			expect((await polka721General.getXUserFee(1)).toNumber()).to.equal(250);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(0);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _startPrice,
			// uint256 _reservePrice,
			// uint256 _startTime,
			// uint256 _endTime,
			// uint256 _fromVersion,
			// uint256 _toVersion
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 2, 1, 1);

			await expect(
				auctionV3.createAuction(polka721General.address, owner.address, 1, 100, 200, 1, 2, 1, 1)
			).to.be.revertedWith('Payment-not-support');

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 200, 100, 1, 2, 1, 1)
			).to.be.revertedWith('Price-invalid');

			await expect(
				auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 2, 1, 1, 1)
			).to.be.revertedWith('Time-invalid');

			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(1);

			expect(await polka721General.ownerOf(1)).to.equal(auctionV3.address);
		});

		it('Cancel Auction 721', async function () {
			const auctionId = await auctionV3.createAuction(
				polka721General.address,
				mockPOLKA.address,
				1,
				100,
				200,
				8999999999,
				9999999999,
				1,
				1
			);

			await expect(auctionV3.connect(addr).cancelAuction(0)).to.be.revertedWith('Auction-not-owner');

			await auctionV3.cancelAuction(0);

			const [, , , , , , , , , , status] = await auctionV3.auctions(auctionId.value);

			expect(status).to.be.false;
			await expect(auctionV3.cancelAuction(0)).to.be.revertedWith('Auction-closed');
		});

		it('Create bid 721 token', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999, 1, 1);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _auctionId,
			// uint256 _price,
			// uint256 _version

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100, 1)
			).to.be.revertedWith('incorrect-payment-method');

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100, 1);
			const [bidder] = await auctionV3.bidAuctions(0);
			expect(bidder).to.equal(addr.address);
			expect(
				auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 10, 1)
			).to.be.revertedWith('price-bid-less-than-max-price');
			expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 200, 1)
			).to.be.revertedWith('user-joined-auction');
			expect(auctionV3.bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 200, 1)).to.be.revertedWith(
				'owner-can-not-bid'
			);
		});

		it('Create Bid 721 ETH', async function () {
			await auctionV3.createAuction(polka721General.address, ZERO_ADDRESS, 1, 100, 200, 1, 9999999999, 1, 1);

			await expect(
				auctionV3.connect(addr).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100, 1, { value: 10 })
			).to.be.revertedWith('Invalid-amount');

			await auctionV3
				.connect(addr)
				.bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 100, 1, { value: 100 });
			const [bidder] = await auctionV3.bidAuctions(0);

			expect(bidder).to.equal(addr.address);

			expect(
				auctionV3.connect(refer).bidAuction(polka721General.address, ZERO_ADDRESS, 1, 0, 10, 1, { value: 10 })
			).to.be.revertedWith('price-bid-less-than-max-price');
		});

		it('Edit Bid 721', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999, 1, 1);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _auctionId,
			// uint256 _price,
			// uint256 _version
			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100, 1);

			await auctionV3.connect(addr).editBidAuction(0, 200);

			const [, , , , , bidPrice] = await auctionV3.bidAuctions(1);
			expect(bidPrice.toNumber()).to.equal(200);
		});

		it('Cancel Bid 721', async function () {
			await auctionV3.createAuction(polka721General.address, mockPOLKA.address, 1, 100, 200, 1, 9999999999, 1, 1);

			await auctionV3.connect(addr).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 100, 1);

			await auctionV3.connect(refer).bidAuction(polka721General.address, mockPOLKA.address, 1, 0, 101, 1);

			await expect(auctionV3.cancelBidAuction(0)).to.be.revertedWith('Not-owner-bid-auction');

			await auctionV3.connect(addr).cancelBidAuction(0);

			const [, , , , , , status] = await auctionV3.bidAuctions(0);

			expect(status).to.be.false;

			await expect(auctionV3.connect(addr).cancelBidAuction(0)).to.be.revertedWith('Bid-closed');
		});
	});

	describe('Auction 1155', () => {
		beforeEach(async () => {
			NFT150 = await hre.ethers.getContractFactory('NFT150');
			nft150 = await NFT150.deploy(polkaURI.address);
			await nft150.deployed();

			await auctionV3.addPOLKANFTs(nft150.address, true);

			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(auctionV3.address, true);
		});

		it('Create Auction 1155', async function () {
			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(0);

			// address _tokenAddress,
			// address _paymentToken,
			// uint256 _tokenId,
			// uint256 _startPrice,
			// uint256 _reservePrice,
			// uint256 _startTime,
			// uint256 _endTime,
			// uint256 _fromVersion,
			// uint256 _toVersion
			await auctionV3.createAuction(nft150.address, mockPOLKA.address, 1, 100, 200, 1, 1, 1, 1);

			await expect(
				auctionV3.createAuction(nft150.address, mockPOLKA.address, 1, 100, 200, 1, 1, 2, 1)
			).to.be.revertedWith('Version-invalid');

			expect((await auctionV3.totalAuctions()).toNumber()).to.equal(1);
			expect((await nft150.balanceOf(auctionV3.address, 1)).toNumber()).to.equal(1);
		});
	});

	after(async function () {});
});
