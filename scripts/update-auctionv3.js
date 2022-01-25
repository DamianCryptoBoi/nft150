const { ethers, upgrades } = require('hardhat');

const old = '0xcAFbA3fDF27a44Cee5b5186975DE7f7D770fDA92';

async function main() {
	const [owner] = await hre.ethers.getSigners();

	const oldContract = await hre.ethers.getContractAt('AuctionVersion', old, owner);

	const AuctionV3 = await ethers.getContractFactory('AuctionV3');
	const auctionV3 = await upgrades.deployProxy(AuctionV3, []);
	await auctionV3.deployed();
	console.log('AuctionV3 deployed to:', auctionV3.address);

	// //ETH
	// await auctionV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	// await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	// await auctionV3.setPaymentMethod('0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp

	//BSC
	await auctionV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb

	const totalAuctions = await oldContract.totalAuctions();
	console.log('migrating auctions ' + totalAuctions);
	await auctionV3.migrateAuction(old);

	// let stepMigrate1 = 1;
	// let blockLoop1 = Math.ceil(totalAuctions / stepMigrate1);

	// for (i = 0; i < blockLoop1; i++) {
	// 	await auctionV3.migrateAuction(old, i * stepMigrate1, (i + 1) * stepMigrate1);
	// 	console.log('migrated auction to: ' + ((i + 1) * stepMigrate1 - 1));
	// }

	const totalBidAuctions = await oldContract.totalBidAuctions();
	console.log('migrating bids ' + totalBidAuctions);
	await auctionV3.migrateBid(old);

	// let stepMigrate2 = 10;
	// let blockLoop2 = Math.ceil(totalBidAuctions / stepMigrate2);
	// for (i = 0; i < blockLoop2; i++) {
	// 	await auctionV3.migrateBid(old, i * stepMigrate2, (i + 1) * stepMigrate2);
	// 	console.log('migrated bid to: ' + ((i + 1) * stepMigrate2 - 1));
	// }

	console.log('moving nfts');
	await oldContract.migrateNft(auctionV3.address);

	console.log('moving payments');
	// await oldContract.migratePayment(auctionV3.address, '0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e'); // usdt
	// await oldContract.migratePayment(auctionV3.address, '0x0000000000000000000000000000000000000000'); //eth
	// await oldContract.migratePayment(auctionV3.address, '0xbec758b709075141c71e1011b3E5ecea9c3cbc0b'); //xp

	//bsc
	await oldContract.migratePayment(auctionV3.address, '0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1');
	await oldContract.migratePayment(auctionV3.address, '0x0000000000000000000000000000000000000000');

	console.log('done');
}

main();
