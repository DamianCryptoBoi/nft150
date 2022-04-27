const { expect, assert, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const { ZERO_ADDRESS } = require('openzeppelin-test-helpers/src/constants');
use(solidity); //to use revertedWith

describe('Unit testing - Market', function () {
	let MarketV3;
	let marketV3;
	let nft150;
	let polka721General;
	let polkaReferral;

	beforeEach(async function () {
		[owner, addr, refer, treasury, addr2] = await ethers.getSigners();
		MarketV3 = await hre.ethers.getContractFactory('MarketV3');
		marketV3 = await MarketV3.deploy();
		await marketV3.deployed();

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

		//random imported erc721

		Import721 = await hre.ethers.getContractFactory('Import721');
		import721 = await Import721.deploy();
		await import721.deployed();

		//random imported ERC1155

		Import1155 = await hre.ethers.getContractFactory('Import1155');
		import1155 = await Import1155.deploy();
		await import1155.deployed();

		//PolkaReferral
		PolkaReferral = await hre.ethers.getContractFactory('PolkaReferral');
		polkaReferral = await PolkaReferral.deploy();
		await polkaReferral.deployed();

		//old market with nft version
		MarketVersion = await hre.ethers.getContractFactory('MarketVersion');
		marketVersion = await MarketVersion.deploy();
		await marketVersion.deployed();

		//old erc1155 with version
		NFT150Version = await hre.ethers.getContractFactory('NFT150Version');
		nft150Version = await NFT150Version.deploy(polkaURI.address);
		await nft150Version.deployed();

		await marketV3.setReferralContract(polkaReferral.address);
		await marketV3.setPaymentMethod(mockPOLKA.address, true);
		await marketV3.setPaymentMethod(ZERO_ADDRESS, true);

		await marketVersion.setReferralContract(polkaReferral.address);
		await marketVersion.setPaymentMethod(mockPOLKA.address, true);
		await marketVersion.setPaymentMethod(ZERO_ADDRESS, true);
	});

	describe('Deployment', function () {
		it('Should set the right owner', async function () {
			expect(await marketV3.owner()).to.equal(owner.address);
		});
	});
	describe('Migration', function () {
		it('Should migrate orders', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.create('urltest', 100, 250);
			await polka721General.create('urltest', 100, 250);

			await polka721General.setApprovalForAll(marketVersion.address, true);
			await marketVersion.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 100, 1, 1);
			await marketVersion.createOrder(polka721General.address, mockPOLKA.address, 2, 1, 100, 1, 1);
			await marketVersion.createOrder(polka721General.address, mockPOLKA.address, 3, 1, 100, 1, 1);

			await marketVersion.cancelOrder(0, 1);

			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketVersion.address, 100000000000000);

			await marketVersion.connect(addr).buy(1, 1, mockPOLKA.address, 1);

			await nft150Version.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150Version.setApprovalForAll(marketVersion.address, true);
			await marketVersion.createOrder(nft150Version.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			expect((await marketVersion.totalOrders()).toNumber()).to.equal(4);

			await marketV3.adminMigrateOrders(marketVersion.address, 0, 3, nft150.address);

			await marketV3.adminMigrateOrders(marketVersion.address, 0, 10, nft150.address);

			await expect(marketV3.adminMigrateOrders(marketVersion.address, 10, 100, nft150.address)).to.be.reverted;

			expect((await marketV3.totalOrders()).toNumber()).to.equal(4);
		});

		it('Should migrate bids', async function () {
			await nft150Version.create(1000, 100, 200, '_uritest', 1, 250);

			await nft150Version.setApprovalForAll(marketVersion.address, true);

			await marketVersion.createOrder(nft150Version.address, mockPOLKA.address, 1, 1, 100, 1, 1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketVersion.address, 1000000);
			await marketVersion
				.connect(addr)
				.createBid(nft150Version.address, mockPOLKA.address, 1, 1, 100, 9999999999, 1);

			await marketVersion
				.connect(addr)
				.createBid(nft150Version.address, mockPOLKA.address, 1, 1, 100, 9999999999, 2);
			await marketVersion
				.connect(addr)
				.createBid(nft150Version.address, mockPOLKA.address, 1, 1, 100, 9999999999, 3);
			await marketVersion
				.connect(addr)
				.createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 9999999999, 4);

			expect((await marketVersion.totalBids()).toNumber()).to.equal(4);

			await marketVersion.acceptBid(0, 1);

			await marketVersion.connect(addr).cancelBid(1);

			await marketV3.adminMigrateBids(marketVersion.address, 0, 2, nft150Version.address, nft150.address);

			await marketV3.adminMigrateBids(marketVersion.address, 0, 10, nft150Version.address, nft150.address);

			await expect(
				marketV3.adminMigrateBids(marketVersion.address, 10, 11, nft150Version.address, nft150.address)
			).to.be.reverted;

			expect((await marketV3.totalBids()).toNumber()).to.equal(4);
		});

		it('Should migrate nft', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.create('urltest', 100, 250);
			await polka721General.create('urltest', 100, 250);

			await polka721General.setApprovalForAll(marketV3.address, true);
			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 2, 1, 100);
			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 3, 1, 100);

			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 100000000000000);

			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);

			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);

			await marketV3.connect(addr).buy(3, 1, mockPOLKA.address);

			await marketV3.setApproveForAllERC721(polka721General.address, owner.address);
			await marketV3.setApproveForAll(nft150.address, owner.address);

			await polka721General.transferFrom(marketV3.address, owner.address, 3);
			await nft150.safeTransferFrom(marketV3.address, owner.address, 1, 1, '0x');

			await marketV3.adminMigratePushNFT(treasury.address, 0, 0);
			await marketV3.adminMigratePushNFT(treasury.address, 0, 10);

			await expect(marketV3.adminMigratePushNFT(owner.address, 10, 11)).to.be.reverted;

			expect((await nft150.balanceOf(treasury.address, 1)).toNumber()).to.equal(1);

			expect(await polka721General.ownerOf(2)).to.equal(treasury.address);
		});
	});

	describe('Withdraw', function () {
		it('Should withdraw all funds', async function () {
			await mockPOLKA.mint(addr.address, 1000000);

			await mockPOLKA.connect(addr).transfer(marketV3.address, 1000);

			await addr.sendTransaction({ to: marketV3.address, value: 10000 });

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(10000);

			await marketV3.pause();

			await marketV3.withdrawFunds(owner.address, mockPOLKA.address);

			await marketV3.withdrawFunds(owner.address, ZERO_ADDRESS);

			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(1000);

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(0);
		});
		it('Should withdraw fee', async function () {
			//mint
			await polka721General.create('urltest', 200, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000000);

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
			//createOrder
			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000);

			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 9999999999);

			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);

			expect((await mockPOLKA.balanceOf(marketV3.address)).toNumber()).to.equal(10000 * 0.025 + 100);

			expect((await marketV3.adminHoldPayment(mockPOLKA.address)).toNumber()).to.equal(100);

			await marketV3.withdrawSystemFee(mockPOLKA.address, addr2.address);

			expect((await mockPOLKA.balanceOf(addr2.address)).toNumber()).to.equal(10000 * 0.025);

			// ETH

			await polka721General.create('urltest', 2000, 250);

			//createOrder
			await marketV3.createOrder(polka721General.address, ZERO_ADDRESS, 2, 1, 10000);

			await marketV3.connect(addr).buy(1, 1, ZERO_ADDRESS, { value: Math.ceil(10000 * (1 + 0.025 + 0.2)) });

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(250);

			await expect(marketV3.withdrawSystemFee(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.reverted;

			await marketV3.withdrawSystemFee(ZERO_ADDRESS, addr2.address);

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(0);
		});
		it('Should transfer holdings to another contract', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 9999999999);

			expect((await mockPOLKA.balanceOf(marketV3.address)).toNumber()).to.equal(100);

			expect((await marketV3.adminHoldPayment(mockPOLKA.address)).toNumber()).to.equal(100);

			await expect(marketV3.sendPaymentToNewContract(mockPOLKA.address, ZERO_ADDRESS)).to.be.reverted;
			await marketV3.sendPaymentToNewContract(mockPOLKA.address, addr2.address);

			expect((await mockPOLKA.balanceOf(addr2.address)).toNumber()).to.equal(100);

			await marketV3
				.connect(addr)
				.createBid(polka721General.address, ZERO_ADDRESS, 1, 1, 100, 9999999999, { value: 100 });

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(100);
			await marketV3.sendPaymentToNewContract(ZERO_ADDRESS, addr2.address);
			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(0);
		});
	});

	describe('Admin transfer approval', function () {
		it('ApproveForAll 721', async function () {
			await polka721General.create('urltest', 100, 250);

			await polka721General.transferFrom(owner.address, marketV3.address, 1);

			await marketV3.setApproveForAllERC721(polka721General.address, owner.address);

			await polka721General.transferFrom(marketV3.address, owner.address, 1);

			expect(await polka721General.ownerOf(1)).to.equal(owner.address);
		});
		it('ApproveForAll 1155', async function () {
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);

			await nft150.safeTransferFrom(owner.address, marketV3.address, 1, 1, '0x');

			await marketV3.setApproveForAll(nft150.address, owner.address);

			await nft150.safeTransferFrom(marketV3.address, addr.address, 1, 1, '0x');

			expect((await nft150.balanceOf(addr.address, 1)).toNumber()).to.equal(1);
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

			await expect(marketV3.createOrder(polka721General.address, owner.address, 1, 1, 10000)).to.be.revertedWith(
				'Payment-method-does-not-support'
			);

			await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000);

			await expect(
				marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000)
			).to.be.revertedWith('Insufficient-token-balance');

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

			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);
			await expect(marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 100, 100)).to.be.revertedWith(
				'Insufficient-token-balance'
			);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(5);

			expect((await nft150.balanceOf(marketV3.address, 1)).toNumber()).to.equal(5);
		});

		it('Buy 721', async function () {
			await polkaReferral.setReferral([addr.address], [refer.address]);

			//mint
			await polka721General.create('urltest', 2000, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 10000);

			//            buy(
			//                uint256 _orderId,
			//                uint256 _quantity,
			//                address _paymentToken
			//            )
			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000000);

			await expect(marketV3.connect(addr).buy(0, 2, mockPOLKA.address)).to.be.revertedWith(
				'Not-available-to-buy'
			);

			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);
			expect(await polka721General.ownerOf(1)).to.equal(addr.address);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(
				1000000000 - 10000 - 10000 * 0.025 - 10000 * 0.2
			);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
			expect((await mockPOLKA.balanceOf(refer.address)).toNumber()).to.equal(Math.floor(10000 * 0.025 * 0.5));
		});

		it('Buy 721 ETH', async function () {
			//mint
			await polka721General.connect(addr2).create('urltest', 2000, 250);
			await polka721General.connect(addr2).transferFrom(addr2.address, owner.address, 1);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			await marketV3.pause();

			await expect(marketV3.createOrder(polka721General.address, ZERO_ADDRESS, 1, 1, 10000)).to.be.reverted;

			await marketV3.unPause();

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, ZERO_ADDRESS, 1, 1, 10000);

			await expect(marketV3.connect(addr).buy(0, 1, ZERO_ADDRESS, { value: 0 })).to.be.reverted;
			await expect(marketV3.connect(addr).buy(1, 1, ZERO_ADDRESS, { value: 0 })).to.be.reverted;
			await expect(marketV3.connect(addr).buy(0, 1, owner.address, { value: 0 })).to.be.reverted;
			await expect(marketV3.connect(addr).buy(0, 1, mockPOLKA.address, { value: 0 })).to.be.reverted;

			await marketV3.connect(addr).buy(0, 1, ZERO_ADDRESS, { value: Math.ceil(10000 * (1 + 0.025 + 0.2)) });
			expect(await polka721General.ownerOf(1)).to.equal(addr.address);

			expect((await ethers.provider.getBalance(marketV3.address)).toNumber()).to.equal(250);
		});

		it('Buy 721 Imported', async function () {
			await polkaReferral.setReferral([addr.address], [refer.address]);

			//mint

			await import721.safeMint(owner.address);
			await import721.setApprovalForAll(marketV3.address, true);
			expect(await import721.ownerOf(0)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(import721.address, mockPOLKA.address, 0, 1, 10000);

			//            buy(
			//                uint256 _orderId,
			//                uint256 _quantity,
			//                address _paymentToken
			//            )
			await mockPOLKA.mint(addr.address, 1000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000000);

			await expect(marketV3.connect(addr).buy(0, 2, mockPOLKA.address)).to.be.revertedWith(
				'Not-available-to-buy'
			);

			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);
			expect(await import721.ownerOf(0)).to.equal(addr.address);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000000 - 10000);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(10000);
			expect((await mockPOLKA.balanceOf(refer.address)).toNumber()).to.equal(0);
		});

		it('Buy 1155', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);
			expect((await nft150.balanceOf(addr.address, 1)).toNumber()).to.equal(1);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(
				1000000 - 10000 - 10000 * 0.025 - 10000 * 0.2
			);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(12000);
		});

		it('Buy 1155 Imported', async function () {
			//mint
			await import1155.mint(owner.address, 1, 100, '0x');
			expect((await import1155.balanceOf(owner.address, 1)).toNumber()).to.equal(100);

			await import1155.setApprovalForAll(marketV3.address, true);

			await marketV3.createOrder(import1155.address, mockPOLKA.address, 1, 10, 10000);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			await marketV3.connect(addr).buy(0, 10, mockPOLKA.address);
			expect((await import1155.balanceOf(addr.address, 1)).toNumber()).to.equal(10);
			expect((await import1155.balanceOf(owner.address, 1)).toNumber()).to.equal(90);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 100000);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(100000);
		});

		it('createBid 721', async function () {
			//mint
			//mint
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			let orderId = await marketV3.createOrder(polka721General.address, mockPOLKA.address, 1, 1, 100);

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
			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 9999999999);

			await expect(
				marketV3
					.connect(addr)
					.createBid(polka721General.address, mockPOLKA.address, 1, 10000, 10000, 9999999999)
			).to.be.reverted;

			await expect(
				marketV3.connect(addr).createBid(polka721General.address, owner.address, 1, 1, 100, 9999999999)
			).to.be.reverted;

			await expect(
				marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 100, 1)
			).to.be.revertedWith('Invalid-expire-time');
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('createBid 721 ETH', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			await marketV3.createOrder(polka721General.address, ZERO_ADDRESS, 1, 1, 100);

			//            createBid(
			//                address _tokenAddress,
			//                address _paymentToken, // payment method
			//                uint256 _tokenId,
			//                uint256 _quantity, // total amount want to buy
			//                uint256 _price, // price of 1 nft
			//                uint256 _expTime
			//            )
			expect((await marketV3.totalBids()).toNumber()).to.equal(0);

			await expect(
				marketV3
					.connect(addr)
					.createBid(polka721General.address, ZERO_ADDRESS, 1, 1, 100, 9999999999, { value: 1 })
			).to.be.revertedWith('Invalid-amount');

			await expect(
				marketV3
					.connect(addr)
					.createBid(polka721General.address, ZERO_ADDRESS, 1, 1, 100, 9999999999, { value: 0 })
			).to.be.revertedWith('Invalid-amount');

			await expect(
				marketV3
					.connect(addr)
					.createBid(polka721General.address, ZERO_ADDRESS, 1, 0, 100, 9999999999, { value: 100 })
			).to.be.reverted;

			await expect(
				marketV3
					.connect(addr)
					.createBid(polka721General.address, owner.address, 1, 0, 100, 9999999999, { value: 100 })
			).to.be.reverted;

			await marketV3
				.connect(addr)
				.createBid(polka721General.address, ZERO_ADDRESS, 1, 1, 100, 9999999999, { value: 100 });

			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('createBid 1155', async function () {
			//mint
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			orderId = await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(1);
			expect((await nft150.balanceOf(marketV3.address, 1)).toNumber()).to.equal(1);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			expect((await marketV3.totalBids()).toNumber()).to.equal(0);
			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 1, 30, 9999999999);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('createBid 1155 ETH', async function () {
			//mint
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			orderId = await marketV3.createOrder(nft150.address, ZERO_ADDRESS, 1, 5, 100);

			expect((await marketV3.totalOrders()).toNumber()).to.equal(1);
			expect((await nft150.balanceOf(marketV3.address, 1)).toNumber()).to.equal(5);

			expect((await marketV3.totalBids()).toNumber()).to.equal(0);

			await expect(
				marketV3.connect(addr).createBid(nft150.address, ZERO_ADDRESS, 1, 2, 30, 9999999999, { value: 0 })
			).to.be.revertedWith('Invalid-amount');

			await expect(
				marketV3.connect(addr).createBid(nft150.address, ZERO_ADDRESS, 1, 2, 30, 9999999999, { value: 30 })
			).to.be.revertedWith('Invalid-amount');

			await marketV3.connect(addr).createBid(nft150.address, ZERO_ADDRESS, 1, 1, 30, 9999999999, { value: 30 });
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);
		});

		it('acceptBid 721', async function () {
			//mint
			await polka721General.create('urltest', 2000, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			const orderId = await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				10000 //prime
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

			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 10000, 9999999999);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);

			await expect(
				marketV3.acceptBid(
					0, //bidid
					10, //quality
					[0]
				)
			).to.be.reverted;

			await marketV3.acceptBid(
				0, //bidid
				1, //quality
				[0]
			);
			let amountNotFee = Math.floor(10000 / (1 + 0.025 + 0.2));

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 10000);
			expect((await mockPOLKA.balanceOf(owner.address)).toNumber()).to.equal(
				amountNotFee + Math.floor(amountNotFee * 0.2)
			);
		});

		it('acceptBid 1155', async function () {
			//mint
			await nft150.create(1000, 200, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect(await nft150.balanceOf(owner.address, 1)).to.equal(200);

			//createOrder
			await marketV3.createOrder(
				nft150.address,
				mockPOLKA.address,
				1,
				30,
				10000 //prime
			);
			const [, , , , q1] = await marketV3.orders(0);

			expect(q1).equal(30);

			await marketV3.createOrder(
				nft150.address,
				mockPOLKA.address,
				1,
				40,
				10000 //prime
			);

			const [, , , , q2] = await marketV3.orders(1);

			expect(q2).equal(40);

			await marketV3.createOrder(
				nft150.address,
				mockPOLKA.address,
				1,
				50,
				10000 //prime
			);

			const [, , , , q3] = await marketV3.orders(2);

			expect(q3).equal(50);

			expect(await nft150.balanceOf(owner.address, 1)).to.equal(80);

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
				nft150.address,
				mockPOLKA.address,
				1,
				100,
				10000,
				9999999999 //days
			);
			expect((await marketV3.totalBids()).toNumber()).to.equal(1);

			await marketV3.acceptBid(
				0, //bidid
				30, //quantity
				[0]
			);

			await marketV3.acceptBid(
				0, //bidid
				70, //quantity
				[1, 2]
			);
			//
			const [, , , , q31] = await marketV3.orders(2);

			expect(q31).equal(20);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(0);
			expect(await nft150.balanceOf(addr.address, 1)).to.equal(100);
		});

		it('acceptBid 1155 part', async function () {
			//mint
			await nft150.create(1000, 200, 2000, '_uritest', 1, 250);

			await nft150.setApprovalForAll(marketV3.address, true);

			//createOrder
			const orderId = await marketV3.createOrder(
				nft150.address,
				mockPOLKA.address,
				1,
				120,
				10000 //prime
			);

			expect((await marketV3.totalBids()).toNumber()).to.equal(0);

			await mockPOLKA.mint(addr.address, 100000000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 100000000000);

			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 100, 100, 9999999999);
			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 100, 100, 9999999999);

			await marketV3.acceptBid(
				0, //bidid
				100, //quality
				[0, 1]
			);
		});

		it('cancelOrder 721', async function () {
			await polka721General.create('urltest', 100, 250);
			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			//createOrder
			await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				100 //prime
			);

			await expect(marketV3.connect(addr).cancelOrder(0)).to.be.reverted;

			await marketV3.cancelOrder(0);

			order = await marketV3.orders(0);

			expect(order.quantity.toNumber()).to.equal(0);
			expect(order.isOnsale).to.equal(false);
		});

		it('Cancel order 1155 success', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)

			await marketV3.cancelOrder(0);
			order = await marketV3.orders(0);

			expect(order.quantity.toNumber()).to.equal(0);
			expect(order.isOnsale).to.equal(false);
		});

		it('Cancel order 1155 revert', async function () {
			//mint
			await nft150.create(1000, 100, 2000, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 10000);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			// buy(uint256 _orderId, uint256 _quantity, address _paymentToken)
			await marketV3.connect(addr).buy(0, 1, mockPOLKA.address);
			await expect(marketV3.cancelOrder(0)).to.be.revertedWith('Order-sold-out');
		});

		it('cancelBid', async function () {
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			const orderId = await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 1, 30, 9999999999);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);

			await marketV3.connect(addr).cancelBid(0);

			await expect(marketV3.acceptBid(0, 1, [0])).to.be.reverted;

			bid = await marketV3.bids(0);

			expect(bid.quantity.toNumber()).to.equal(0);
			expect(bid.status).to.equal(false);
			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000);
		});

		it('cancelBid ETH', async function () {
			await marketV3
				.connect(addr)
				.createBid(polka721General.address, ZERO_ADDRESS, 1, 1, 30, 9999999999, { value: 30 });

			await marketV3.connect(addr).cancelBid(0);
			bid = await marketV3.bids(0);

			expect(bid.quantity.toNumber()).to.equal(0);
			expect(bid.status).to.equal(false);
		});

		it('cancelBid 1155 revert ', async function () {
			//mint
			await nft150.create(1000, 100, 200, '_uritest', 1, 250);
			await nft150.setApprovalForAll(marketV3.address, true);
			expect((await marketV3.totalOrders()).toNumber()).to.equal(0);
			const orderId = await marketV3.createOrder(nft150.address, mockPOLKA.address, 1, 1, 100);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(nft150.address, mockPOLKA.address, 1, 1, 30, 9999999999);

			expect((await mockPOLKA.balanceOf(addr.address)).toNumber()).to.equal(1000000 - 30);
			await marketV3.acceptBid(
				0, //bỉdid
				1, //quality,
				[orderId.value]
			);
			await expect(marketV3.connect(addr).cancelBid(0)).to.be.revertedWith('Invalid-bidder');
		});
		it('acceptBid 721 revert', async function () {
			//mint
			await polka721General.create('urltest', 2000, 250);
			await polka721General.create('urltest', 2000, 250);
			await polka721General.create('urltest', 2000, 250);

			await polka721General.setApprovalForAll(marketV3.address, true);
			expect(await polka721General.ownerOf(1)).to.equal(owner.address);

			await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				1,
				1,
				10000 //prime
			);

			await marketV3.createOrder(
				polka721General.address,
				ZERO_ADDRESS,
				2,
				1,
				10000 //prime
			);

			await marketV3.createOrder(
				polka721General.address,
				mockPOLKA.address,
				3,
				1,
				10000 //prime
			);

			await mockPOLKA.mint(addr.address, 1000000);
			await mockPOLKA.connect(addr).approve(marketV3.address, 1000000);

			await marketV3.connect(addr).createBid(polka721General.address, mockPOLKA.address, 1, 1, 10000, 9999999999);

			await expect(
				marketV3.connect(addr).acceptBid(
					0, //bidid
					1, //quality
					[0]
				)
			).to.be.reverted;
			await expect(
				marketV3.acceptBid(
					0, //bidid
					1, //quality
					[1]
				)
			).to.be.reverted;

			await expect(
				marketV3.acceptBid(
					0, //bidid
					1, //quality
					[2]
				)
			).to.be.reverted;

			await network.provider.send('evm_increaseTime', [99999999999]);
			await network.provider.send('evm_mine');

			await expect(
				marketV3.acceptBid(
					0, //bidid
					1, //quality
					[0]
				)
			).to.be.reverted;
		});
	});

	after(async function () {});
});
