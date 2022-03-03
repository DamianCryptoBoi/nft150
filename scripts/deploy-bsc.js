const hre = require('hardhat');

//PLEASE PROVIDE BASE URI FOR THE URI CONTRACT
const BASE_URI = ''; //EX: https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/

const main = async () => {
	console.log('--- Start Deploy  BSC ---');

	const PolkaURI = await hre.ethers.getContractFactory('PolkaURI');
	const polkaURI = await PolkaURI.deploy(BASE_URI);
	await polkaURI.deployed();
	console.log('PolkaURI deployed at: ', polkaURI.address);

	//Polka721General
	const Polka721General = await hre.ethers.getContractFactory('Polka721General');
	const polka721General = await Polka721General.deploy(polkaURI.address);
	await polka721General.deployed();
	console.log('POLKA721_CONTRACT deployed at: ', polka721General.address);

	//NFT150
	const NFT150 = await hre.ethers.getContractFactory('NFT150');
	const nft150 = await NFT150.deploy(polkaURI.address);
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

	//PolkaReferral
	const PolkaReferral = await hre.ethers.getContractFactory('PolkaReferral');
	const polkaReferral = await PolkaReferral.deploy();
	await polkaReferral.deployed();
	console.log('REFERRAL_CONTRACT deployed at: ', polkaReferral.address);

	console.log('Setting market');
	await marketV3.setReferralContract(polkaReferral.address);

	// PLEASE CHANGE THESE TOKEN ADDRESSES, keep 0X00...000 ONLY BECAUSE IT STAND FOR THE NATIVE COIN (IN THIS CASE, BNB)

	// await marketV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	await marketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb

	console.log('Setting Auction');

	// await auctionV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
