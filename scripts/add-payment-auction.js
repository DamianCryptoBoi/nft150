const hre = require('hardhat');

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	address = '0x15B2a247F9c881Ec35aB9ed31DC01d8fF6634450';
	const auctionV3 = await hre.ethers.getContractAt('MarketV3', address, admin);

	// //ETH
	// await auctionV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	// await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	// await auctionV3.setPaymentMethod('0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp

	//bsc
	// await auctionV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	// await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb

	//polygon
	await auctionV3.setPaymentMethod('0xc592b11915e3f8F963F3aE2170b530E38319b388', true); // usdt
	await auctionV3.setPaymentMethod('0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6', true); //eth

	console.log('done');
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
