const hre = require('hardhat');

const users = [];

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '';
	let old1155 = '';
	let uri = '';
	let marketV3 = '';
	let NFT150 = '';

	const oldMarketContract = await hre.ethers.getContractAt('MarketVersion', oldMarket, admin);
	await oldMarketContract.pause();
	console.log('oldMarketContract paused');

	const old1155Contract = await hre.ethers.getContractAt('NFT150Version', old1155, admin);

	const polkaMarketV3 = await hre.ethers.getContractAt('MarketV3', marketV3, admin);

	const nft150 = await hre.ethers.getContractAt('NFT150', NFT150, admin);

	//PolkaMarketV3
	// const PolkaMarketV3 = await hre.ethers.getContractFactory('MarketV3');
	// const polkaMarketV3 = await PolkaMarketV3.deploy();
	// await polkaMarketV3.deployed();
	// console.log('MARKET_CONTRACT deployed at: ', polkaMarketV3.address);

	// users.push(oldMarket);
	// users.push(polkaMarketV3.address);

	// //NFT150
	// const NFT150 = await hre.ethers.getContractFactory('NFT150');
	// const nft150 = await NFT150.deploy('0xF5C68C2FBAb7bC61ec32E8d57efE1D7B02EBa4b1');
	// await nft150.deployed();
	// console.log('ERC1155_CONTRACT deployed at: ', nft150.address);

	// await polkaMarketV3.setReferralContract('0xEC2808464Eb32cf413C288F33d1d45b3766B178e');
	// // await polkaMarketV3.addPOLKANFTs("0xfBdd4448A593D316eD995E7507A0C1C24ED20772", true, false);
	// // await polkaMarketV3.addPOLKANFTs("0xDA174A9A304f6003F8D3181d3e68D5DCF3031065", true, false);

	// await polkaMarketV3.setPaymentMethod('0xc592b11915e3f8F963F3aE2170b530E38319b388', true); // usdt
	// await polkaMarketV3.setPaymentMethod('0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6', true); //eth

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
		for (j = 1; j <= totalNft; j++) {
			console.log(`checking ${users[i]} with token id ${j}`);
			const currentBalance = await old1155Contract.balanceOf(users[i], j);
			if (currentBalance > 0) {
				console.log(`user: ${users[i]} token: ${j} balance: ${currentBalance}`);
				try {
					await nft150.migrateBalancesFromV1(users[i], j, j, old1155);
				} catch {
					console.log(`err at user ${users[i]} token ${j}`);
				}
			}
		}
	}

	console.log('done');
};

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
