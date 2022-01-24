const hre = require('hardhat');

const users = [
	'0x9c42a6f8f5737609a0d77cc21cdb80660174de26',
	'0x005d5aa51f55658754b4c02ba92e642271f217db',
	'0xdb86dee7ddfe4f39405594e3dda757e454ba1893',
	'0x1496d279815d6394f82e2ae1197dd8cd636d1c0a',
	'0x2764e8fdce22cd634fba788a2cdc13f03eda93aa',
	'0xcf083c586409b20be200c9ed1911f3db59d87d30',
	'0xe6a7d29d855f1674568846c33a9783490af48dba',
	'0x5168a4b3f1054598f81e763b237141d524172f10',
	'0xfb1c4ec6f8f09cfd91cf02a923f01021bcecb6bc',
	'0xed3dd625f72595f706860b9b52585e9f5d1d6055',
	'0xb26b3d15c04323c8f0414353ae96adeb5ec9ea79',
	'0xb5b2a058e9d3ca77a180a3cfdcb93598876c6dd1',
	'0x86ea72400d30c48e40b3c35357fc79a4fac3aebf',
	'0x703a48a8c3c73a5f3d1fec68b3c93cd92a3c6de4',
	'0x7e426921b7a63cfc1c5bbbb9d75593068647c4ea',
	'0xd1ffa45fb5d3c450c9522c750ae17b9ce1d29a40',
	'0x9bb1d6f0660b9bee428b8f63749daf213ac18002',
	'0x02ba5df24569251f4ff91585623a723e6c90f088',
	'0x1ba2f82bc15f84196c367055e953f9992a7336b6',
	'0x4bb627101d9274a81ad5652dfe2fa3a8cb8648aa',
	'0xab61003d140eace1a3ba617b6b703324d8b09350',
	'0xe1bf9515af3f0f46f785ce317da8c30f94f93db3',
	'0xe853257d164d1703c1521b35b7f6213205e478dd',
	'0x71f2285c11458dae46810971a9424f26cc019633',
	'0x02f6957fca825d9ec7756b2c2cd48a5d8d6663f5',
	'0xa1f9d13801706e06446783797bdaecd7a2fe2c05',
	'0x85d6d53a4fb0978a6602f75221e74f26cd86c2dd',
	'0x9474420607b0353e0eb60fd3f61f1cdee0d0fc8c',
	'0xcbe0898f2718d2b0368933515f55bffb5cd26afd',
	'0x1b9db0179ada96545b4c9514c2909f2a9c12c5a2',
	'0x9795d053b8f5e0eee604ddbe013b7f659238be38',
	'0x3dcef597a09404043fc58c570b607820a1b22284',
	'0x502d11e2944a0761e7bb41df2e4076560b541054',
	'0xd7ba2be52af7845ff04514c7da48f003410f811f',
	'0xa593af0961caef34996f13205d67a076902f0ab4',
	'0xa629bc518d7528b406b0d05e7d36d5173ccb182a',
	'0x7828bf53e0030f75bdb25369c1b405a834ee6b13',
	'0x0c582004302ccd2b1eeb7074392189a1a2247cb0',
	'0xab22f1a4f90202c02a8fd377ed374bcb5f6bafd5',
	'0xbc709f8772e051b9ba59517a3e24a7e1bcc042c7',
	'0xa4ced30258b5692fe7946893770ae7c293e6e4cc',
	'0xc9217818aa2dc5472f4e3ec1241bff76ff44d7d9',
	'0x1f2dd5db9ce0c786ffb07836e759cafb179e3b9c',
	'0xfe9e7306894a1dc3f786d6a70d19127ffcefa2f4',
	'0xda0d6657f87f6247d9f888a64ea9b94153ba821f',
	'0x47afd827f474b490e060956fc1b9dd0798d9bd52',
	'0x1ef739ed8f6a5740dcafb86f191255dc3fae01e2',
	'0x83079362e0fbc63dab42808d5f23c174a65ca412',
	'0x7016b01e87815e344bec4c25ff51283ca2c93e7b',
	'0x45d9cdea50264f26a8fae10fa4904814d843a503',
	'0x1f32554c5ebceee851bb611848e7e36e7e23042d',
	'0x0e315d6b311d871259013bb66dc7c4e69636054b',
]; //stg

// Ethereum:
// market: 0xc0dbB219BB9e5F5695a52482F6b38d20116a6D6f
// 1155: 0xDA174A9A304f6003F8D3181d3e68D5DCF3031065
// auction: 0xB7b5398279497f1592C55523A5F13Df1e5171439

// Polygon:
// market: 0x948F4f68AF9ef31ec97867b8c4BDfe435Df00CA5
// 1155: 0xE5911f4D0Bc114F33056B70D03eD2A4e216c61bf
// auction: 0x15B2a247F9c881Ec35aB9ed31DC01d8fF6634450

// BSC:
// market: 0x8754651a5Ca7D7AEdf759235a0deF73E0E9be7Bd
// 1155: 0xbc32D38A17236341c2A4dC0AFa9Ac2FFEB0D9E35
//// auction: 0xcAFbA3fDF27a44Cee5b5186975DE7f7D770fDA92

const main = async () => {
	const [admin] = await hre.ethers.getSigners();

	let oldMarket = '0xc0dbB219BB9e5F5695a52482F6b38d20116a6D6f';
	let old1155 = '0xDA174A9A304f6003F8D3181d3e68D5DCF3031065';

	const oldMarketContract = await hre.ethers.getContractAt('MarketVersion', oldMarket, admin);
	await oldMarketContract.pause();
	console.log('oldMarketContract paused');

	const old1155Contract = await hre.ethers.getContractAt('NFT150Version', old1155, admin);

	//PolkaMarketV3
	const PolkaMarketV3 = await hre.ethers.getContractFactory('MarketV3');
	const polkaMarketV3 = await PolkaMarketV3.deploy();
	await polkaMarketV3.deployed();
	console.log('MARKET_CONTRACT deployed at: ', polkaMarketV3.address);

	//NFT150
	const NFT150 = await hre.ethers.getContractFactory('NFT150');
	const nft150 = await NFT150.deploy(polkaURI.address);
	await nft150.deployed();
	console.log('ERC1155_CONTRACT deployed at: ', nft150.address);

	await polkaMarketV3.setReferralContract('0x54eDEaFF620AC9e6295df132d381883d033e784C');
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

	console.log('migrating to new 1155');

	const totalNft = await old1155Contract._currentTokenID();
	console.log('total erc1155: ' + totalNft);
	nft150.migrateDataFromV1(1, totalNft, old1155);

	for (i = 0; i < users.length; i++) {
		for (j = 1; i <= totalNft; j++) {
			const currentBalance = await old1155Contract.balanceOf(users[i], j);
			if (currentBalance > 0) {
				nft150.migrateBalancesFromV1(users[i], j, j, old1155);
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
