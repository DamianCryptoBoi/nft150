const hre = require('hardhat');

const users = [
	'0xa4ced30258b5692fe7946893770ae7c293e6e4cc',
	'0x2764e8fdce22cd634fba788a2cdc13f03eda93aa',
	'0xed3dd625f72595f706860b9b52585e9f5d1d6055',
	'0xa629bc518d7528b406b0d05e7d36d5173ccb182a',
	'0x7828bf53e0030f75bdb25369c1b405a834ee6b13',
	'0x9c42a6f8f5737609a0d77cc21cdb80660174de26',
	'0xa593af0961caef34996f13205d67a076902f0ab4',
	'0x0c582004302ccd2b1eeb7074392189a1a2247cb0',
	'0xd1ffa45fb5d3c450c9522c750ae17b9ce1d29a40',
	'0xcf083c586409b20be200c9ed1911f3db59d87d30',
	'0xe1bf9515af3f0f46f785ce317da8c30f94f93db3',
	'0x86ea72400d30c48e40b3c35357fc79a4fac3aebf',
	'0x7e426921b7a63cfc1c5bbbb9d75593068647c4ea',
	'0x420f8e0b241c54983d9a585317892c78d591fc33',
	'0x83079362e0fbc63dab42808d5f23c174a65ca412',
	'0x334131bb7548f366521885426a537593cfaf8ac6',
];

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '0xb6F9E7CF997087B2b1DE75aAd73120D012337BA6';
	let old1155 = '0x45fFFaa2A4b809AA2B1D9357f3a9fd3b03218284';
	let uri = '0xd4aD321ad9D135Fea14B21248916107705323Dce';
	let referral = '0xA19dc16e53eb0d9fDE3d4f3d58c73F9b91E5b39D';

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
	const nft150 = await NFT150.deploy(uri);
	await nft150.deployed();
	console.log('ERC1155_CONTRACT deployed at: ', nft150.address);

	await polkaMarketV3.setReferralContract(referral);
	// await polkaMarketV3.addPOLKANFTs("0xfBdd4448A593D316eD995E7507A0C1C24ED20772", true, false);
	// await polkaMarketV3.addPOLKANFTs("0xDA174A9A304f6003F8D3181d3e68D5DCF3031065", true, false);

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

	// await polkaMarketV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	// await polkaMarketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb

	await polkaMarketV3.setPaymentMethod('0xc592b11915e3f8F963F3aE2170b530E38319b388', true); // usdt
	await polkaMarketV3.setPaymentMethod('0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6', true); //eth

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

	// try {
	// 	//ETH
	// 	// old1155Contract.withdrawFunds(polkaMarketV3.address, '0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e'); // usdt
	// 	// old1155Contract.withdrawFunds(polkaMarketV3.address, '0x0000000000000000000000000000000000000000'); //eth
	// 	// old1155Contract.withdrawFunds(polkaMarketV3.address, '0xbec758b709075141c71e1011b3E5ecea9c3cbc0b'); //xp
	// 	//BSC
	// 	await old1155Contract.withdrawFunds(polkaMarketV3.address, '0x0000000000000000000000000000000000000000');
	// 	await old1155Contract.withdrawFunds(polkaMarketV3.address, '0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1');
	// } catch {
	// 	console.log('Move payment tokens FAILED!');
	// }

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
