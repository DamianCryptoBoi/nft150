const hre = require('hardhat');

const users = []; //stg

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '';
	let old1155 = '';
	let uri = '';
	let referral = '';

	const oldMarketContract = await hre.ethers.getContractAt('MarketVersion', oldMarket, admin);
	await oldMarketContract.pause();
	console.log('oldMarketContract paused');

	const old1155Contract = await hre.ethers.getContractAt('NFT150Version', old1155, admin);

	//PolkaMarketV3
	const PolkaMarketV3 = await hre.ethers.getContractFactory('MarketV3');
	const polkaMarketV3 = await PolkaMarketV3.deploy();
	await polkaMarketV3.deployed();
	console.log('MARKET_CONTRACT deployed at: ', polkaMarketV3.address);

	users.push(oldMarket);
	users.push(polkaMarketV3.address);

	//NFT150
	const NFT150 = await hre.ethers.getContractFactory('NFT150');
	const nft150 = await NFT150.deploy('');
	await nft150.deployed();
	console.log('ERC1155_CONTRACT deployed at: ', nft150.address);

	await polkaMarketV3.setReferralContract(referral);
	// await polkaMarketV3.addPOLKANFTs("0xfBdd4448A593D316eD995E7507A0C1C24ED20772", true, false);
	// await polkaMarketV3.addPOLKANFTs("0xDA174A9A304f6003F8D3181d3e68D5DCF3031065", true, false);

	await polkaMarketV3.setPaymentMethod(
		'0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', // usdt
		true
	);

	await polkaMarketV3.setPaymentMethod(
		'0x0000000000000000000000000000000000000000', // eth
		true
	);

	await polkaMarketV3.setPaymentMethod(
		'0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', // XP polka
		true
	);

	//Migrate Data

	console.log('---adminMigrateOrders---');
	const totalOrder = await oldMarketContract.totalOrders();
	console.log('---totalorder--- ', totalOrder.toNumber());
	let stepMigrate = 10;
	let blockLoop = Math.ceil(totalOrder / stepMigrate);
	for (i = 0; i < blockLoop; i++) {
		await polkaMarketV3.adminMigrateOrders(
			oldMarket,
			i * stepMigrate,
			i * stepMigrate + stepMigrate - 1,
			nft150.address
		);
		console.log('---Order id migrated to: --- ', (i + 1) * stepMigrate);
	}
	console.log('---Finish adminMigrateOrders---');

	console.log('---adminMigrateBids---');
	const totalBid = await oldMarketContract.totalBids();
	let blockLoopBid = Math.ceil(totalBid / 10);
	console.log('---totalBid--- ', totalBid.toNumber());
	for (i = 0; i < blockLoopBid; i++) {
		await polkaMarketV3.adminMigrateBids(oldMarket, i * 10, i * 10 + 10 - 1, old1155, nft150.address);
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

	console.log('Move payment tokens');

	//ETH
	old1155Contract.withdrawFunds(polkaMarketV3.address, '0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e'); // usdt
	old1155Contract.withdrawFunds(polkaMarketV3.address, '0x0000000000000000000000000000000000000000'); //eth
	old1155Contract.withdrawFunds(polkaMarketV3.address, '0xbec758b709075141c71e1011b3E5ecea9c3cbc0b'); //xp

	console.log('migrating to new 1155');

	const totalNft = await old1155Contract._currentTokenID();
	console.log('total erc1155: ' + totalNft);
	console.log('migrating data');
	await nft150.migrateDataFromV1(1, totalNft, old1155);
	console.log('migrating balances');

	for (i = 0; i < users.length; i++) {
		console.log(`Migrating balance for ${users[i]}`);
		await nft150.migrateBalancesFromV1(users[i], 1, totalNft, old1155);
	}

	console.log('done');
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
