const hre = require('hardhat');

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '0xa63D4353237fE8d682D93DF84D3b7e47130f02f9';
	const oldMarketContract = await hre.ethers.getContractAt('MarketV3', oldMarket, admin);
	await oldMarketContract.pause();
	console.log('oldMarketContract paused');

	//PolkaMarketV3
	const PolkaMarketV3 = await hre.ethers.getContractFactory('MarketV3');
	const polkaMarketV3 = await PolkaMarketV3.deploy();
	await polkaMarketV3.deployed();
	console.log('MARKET_CONTRACT deployed at: ', polkaMarketV3.address);

	// //ETH

	// await polkaMarketV3.setReferralContract('0x66489c57BCfd6eccD4CC8253EB8588972a6CAd5D');
	// await polkaMarketV3.setPaymentMethod(
	// 	'0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', // usdt
	// 	true
	// );

	// await polkaMarketV3.setPaymentMethod(
	// 	'0x0000000000000000000000000000000000000000', // eth
	// 	true
	// );

	// await polkaMarketV3.setPaymentMethod(
	// 	'0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', // XP polka
	// 	true
	// );

	//BSC
	await polkaMarketV3.setReferralContract('0xE5023ee4C4240C97E8eE57B4F932c3Ce873Da216');
	await polkaMarketV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	await polkaMarketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb

	// //Polygon;
	// await polkaMarketV3.setReferralContract('0x6dd54774Da823E2eef7BDf908f13353ee659dfCb');
	// await polkaMarketV3.setPaymentMethod('0xc592b11915e3f8F963F3aE2170b530E38319b388', true); // usdt
	// await polkaMarketV3.setPaymentMethod('0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6', true); //eth

	//Migrate Data

	console.log('---adminMigrateOrders---');
	const totalOrder = await oldMarketContract.totalOrders();
	console.log('---totalorder--- ', totalOrder.toNumber());
	let stepMigrate = 1;
	let blockLoop = Math.ceil(totalOrder / stepMigrate);
	for (i = 0; i < blockLoop; i++) {
		await polkaMarketV3.adminMigrateOrders(oldMarket, i * stepMigrate, i * stepMigrate + stepMigrate - 1);
		console.log('---Order id migrated: --- ', i);
	}
	console.log('---Finish adminMigrateOrders---');

	console.log('---adminMigrateBids---');
	const totalBid = await oldMarketContract.totalBids();
	let blockLoopBid = Math.ceil(totalBid / 10);
	console.log('---totalBid--- ', totalBid.toNumber());
	for (i = 0; i < blockLoopBid; i++) {
		await polkaMarketV3.adminMigrateBids(oldMarket, i * 10, i * 10 + 10 - 1);
	}
	console.log('---Finish adminMigrateBids---');

	console.log('---adminMigratePushNFT---');
	let stepMigrateNFT = 10;
	let blockLoopNFT = Math.ceil(totalOrder / stepMigrateNFT);
	for (i = 0; i < blockLoopNFT; i++) {
		await oldMarketContract.adminMigratePushNFT(
			polkaMarketV3.address,
			i * stepMigrateNFT,
			i * stepMigrateNFT + stepMigrateNFT - 1
		);
	}
	console.log('---Finish adminMigratePushNFT---');
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
