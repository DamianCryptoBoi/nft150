const hre = require('hardhat');

//PLEASE PROVIDE THE ADDRESSES OF THE REFERRAL CONTRACT & THE URI CONTRACT
REFERRAL_CONTRACT = '';
URI_CONTRACT = '';

const main = async () => {
	console.log('--- Start Deploy Ethereum ---');
	//NFT150
	const NFT150 = await hre.ethers.getContractFactory('NFT150');
	const nft150 = await NFT150.deploy(URI_CONTRACT);
	await nft150.deployed();
	console.log('ERC1155_CONTRACT deployed at: ', nft150.address);

	//MarketV3
	const MarketV3 = await hre.ethers.getContractFactory('MarketV3');
	const marketV3 = await MarketV3.deploy();
	await marketV3.deployed();
	console.log('MARKET_CONTRACT deployed at: ', marketV3.address);

	//AuctionV3
	const AuctionV3 = await ethers.getContractFactory('AuctionV3');
	const auctionV3 = await upgrades.deployProxy(AuctionV3, []);
	await auctionV3.deployed();
	console.log('AUCTION_CONTRACT deployed at: ', auctionV3.address);

	console.log('Setting market');
	await marketV3.setReferralContract(REFERRAL_CONTRACT);

	// PLEASE CHANGE THESE TOKEN ADDRESSES, keep 0X00...000 ONLY BECAUSE IT STAND FOR THE NATIVE COIN (IN THIS CASE, ETH)

	// await marketV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	await marketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	// await marketV3.setPaymentMethod(' 0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp

	console.log('Setting Auction');
	// await auctionV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	// await auctionV3.setPaymentMethod('0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp

	console.log('Setting Finish');
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
