const hre = require('hardhat');

const users = [];

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '0x979929a447971353d2a2014124Eb4e4ba975436e';
	let old1155 = '0xeFF2b1201f0137Dbed3bA5c27674f1238F851ae1';
	let uri = '0x4dC381C74beF4E6fb4E17F0483dec2C62892d817';
	let marketV3 = '0x1a7c2e690BCF81552522AAE7cC5e772ACd3Adcc1';
	let NFT150 = '0xAc9169F254A3041A598345CAc54e9b6CC099aca9';

	users.push(oldMarket);
	users.push(marketV3);

	const oldMarketContract = await hre.ethers.getContractAt('MarketVersion', oldMarket, admin);
	await oldMarketContract.pause();
	console.log('oldMarketContract paused');

	const old1155Contract = await hre.ethers.getContractAt('NFT150Version', old1155, admin);

	const polkaMarketV3 = await hre.ethers.getContractAt('MarketV3', marketV3, admin);

	const nft150 = await hre.ethers.getContractAt('NFT150', NFT150, admin);

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
