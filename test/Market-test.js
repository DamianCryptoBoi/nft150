const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
use(solidity); //to user revertedWith

describe('Unit testing - Market', function () {
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

		Polka721General = await hre.ethers.getContractFactory('Polka721General');
		polka721General = await Polka721General.deploy(polkaURI.address);
		await polka721General.deployed();

		NFT150 = await hre.ethers.getContractFactory('NFT150');
		nft150 = await NFT150.deploy(polkaURI.address);
		await nft150.deployed();

		//PolkaReferral
		PolkaReferral = await hre.ethers.getContractFactory('PolkaReferral');
		polkaReferral = await PolkaReferral.deploy();
		await polkaReferral.deployed();

		await marketV3.setReferralContract(polkaReferral.address);
		await marketV3.setPaymentMethod(mockPOLKA.address, true);
		await marketV3.addPOLKANFTs(polka721General.address, true, false);
		await marketV3.addPOLKANFTs(nft150.address, true, false);

		await auctionV3.setReferralContract(polkaReferral.address);
		await auctionV3.setPaymentMethod(mockPOLKA.address, true);
		await auctionV3.addPOLKANFTs(polka721General.address, true);
		await auctionV3.addPOLKANFTs(nft150.address, true);
	});

	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await marketV3.owner()).to.equal(owner.address);
		});
	});
	describe('Transactions', function () {
		it('setSystemFee', async function () {
			await marketV3.setSystemFee(9999);
			expect((await marketV3.yRefRate()).toNumber()).to.equal(9999);
		});

		it('setPaymentMethod', async function () {
			expect(await marketV3.paymentMethod(mockPOLKA.address)).to.be.true;

			// 2**256 - 1 to HEX or 115792089237316195423570985008687907853269984665640564039457584007913129639935
			expect((await mockPOLKA.allowance(marketV3.address, owner.address)).toHexString()).to.equal(
				'0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
			);
		});

		//withdrawFunds => only admin call - onlyOwner => don`t unit test

		it('createOrder new 721', async function () {
			//      address _tokenAddress,
			//		address _retailer,
			//		address _paymentToken, // payment method
			//		uint256 _tokenId,
			//		uint256 _quantity, // total amount for sale
			//		uint256 _price, // price of 1 nft
			//		uint256 _retailFee
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);

			expect((await polka721General.getXUserFee(1)).toNumber()).to.equal(250);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//create _tokenId 1
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000, 1, 1);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(1);

			expect(await polka721General.ownerOf(1)).to.equal(marketV3.address);
		});

		it('createOrder new 1155', async function () {
			//        uint256 _maxSupply,
			//        uint256 _initialSupply,
			//        uint256 _loyaltyFee,
			//        string memory _uri,
			//        bytes memory _data
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await nft150.getXUserFee(1)).toNumber()).to.equal(250);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(1);
			expect((await nft150.balanceOf(marketV3.address, 1)).toNumber()).to.equal(1);
		});

		it('Buy 721', async function () {
			await polkaReferral.setReferral([addr.address], [refer.address]);

			//mint
			await polka721General.create('urltest', 2000, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000, 1, 1);

			//            buy(
			//                uint256 _orderId,
			//                uint256 _quantity,
			//                address _paymentToken
			//            )
			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000000);

			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address, 1);
			expect(await polka721General.ownerOf(1)).to.equal(addr.address);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(
				1000000000 - 10000 - 10000 * 0.025 - 10000 * 0.2
			);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
			expect((await mockPOLKA.balanceOf(refer.address)).toNumber()).to.equal(Math.floor(10000 * 0.025 * 0.5));
		});

		it('Buy 1155', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address, 1);
			expect((await nft150.balanceOf(addr.address, 1)).toNumber()).to.equal(1);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(
				1000000 - 10000 - 10000 * 0.025 - 10000 * 0.2
			);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
		});

		it('createBid 721', async function () {
			//mint
			//mint
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);
			//            createBid(
			//                address _tokenAddress,
			//                address _paymentToken, // payment method
			//                uint256 _tokenId,
			//                uint256 _quantity, // total amount want to buy
			//                uint256 _price, // price of 1 nft
			//                uint256 _expTime
			//            )
			expect((await marketV3.totalBids()).toNumber()).to.equal(0);
			await marketV3.connect(addr).createBid(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				100,
				3, //days
				1
			);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('createBid 1155', async function () {
			//mint
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(1);
			expect((await nft150.balanceOf(marketV3.address, 1)).toNumber()).to.equal(1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			expect((await marketV3.totalBids()).toNumber()).to.equal(0);
			await marketV3.connect(addr).createBid(
				nft150.address,
				mockPOLKA.address,
				1,
				1,
				30,
				3, //days
				1
			);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('acceptBid 721', async function () {
			//mint
			await polka721General.create('urltest', 2000, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				10000, //prime
				1,
				1
			);

			//            createBid(
			//                address _tokenAddress,
			//                address _paymentToken, // payment method
			//                uint256 _tokenId,
			//                uint256 _quantity, // total amount want to buy
			//                uint256 _price, // price of 1 nft
			//                uint256 _expTime
			//            )

			expect((await marketV3.totalBids()).toNumber()).to.equal(0);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				10000,
				3, //days
				1
			);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);

			await marketV3.acceptBid(
				0, //bỉdid
				1 //quality
			);
			let amontNotFee = Math.floor(10000 / (1 + 0.025 + 0.2));

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 10000);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(
				amontNotFee + Math.floor(amontNotFee * 0.2)
			);
		});

		it('cancelOrder', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				100, //prime
				1,
				1
			);

			await marketV3.cancelOrder(0, 1);
			order = await marketV3.orders(0);

			expect(order.quantity.toNumber()).to.equal(0);
			expect(order.isOnsale).to.equal(false);
		});

		it('Cancel order 1155 success', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			expect(await nft150.nftOnSaleVersion(1, 1)).to.equal(true);
			await marketV3.cancelOrder(0, 1);
			expect(await nft150.nftOnSaleVersion(1, 1)).to.equal(false);
		});

		it('Cancel order 1155 revert', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address, 1);
			await expect(marketV3.cancelOrder(0, 1)).to.be.revertedWith('Version-not-on-sale');
		});

		it('cancelBid', async function () {
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(
				nft150.address,
				mockPOLKA.address,
				1,
				1,
				30,
				3, //days
				1
			);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);

			await marketV3.connect(addr).cancelBid(0);
			bid = await marketV3.bids(0);

			expect(bid.quantity.toNumber()).to.equal(0);
			expect(bid.status).to.equal(false);
			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000);
		});

		it('cancelBid 1155 revert ', async function () {
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(
				nft150.address,
				mockPOLKA.address,
				1,
				1,
				30,
				3, //days
				1
			);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);
			await marketV3.acceptBid(
				0, //bỉdid
				1 //quality
			);
			await expect(marketV3.connect(addr).cancelBid(0)).to.be.revertedWith('Invalid-bidder');
		});

		it('adminMigrateData', async function () {
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 200, 1, 1);

			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 200, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 1, 30, 3, 1);

			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 1, 40, 3, 1);

			//721
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 3, 1);

			MarketV3New = await hre.ethers.getContractFactory('MarketV3');
			marketV3New = await MarketV3New.deploy();
			await marketV3New.deployed();

			//            await marketV3.setApproveForAll(nft150.address, marketV3New.address);  //need for Deploy
			//            await marketV3.setApproveForAllERC721(polka721General.address, marketV3New.address); //need for Deploy

			await marketV3New.adminMigrateOrders(marketV3.address);
			await marketV3.adminMigratePushNFT(marketV3New.address);
			await marketV3New.adminMigrateBids(marketV3.address);

			expect((await marketV3New.totalOrders()).toNumber()).to.equal(3);
			expect((await marketV3New.totalBids()).toNumber()).to.equal(3);

			expect(await polka721General.ownerOf(1)).to.equal(marketV3New.address);
			expect((await nft150.balanceOf(marketV3New.address, 1)).toNumber()).to.equal(2);
		});
	});

	after(async function () {});
});
