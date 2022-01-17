const { ethers, upgrades } = require('hardhat');

async function main() {
	const AuctionV3 = await ethers.getContractFactory('AuctionV3');
	const auctionV3 = await upgrades.deployProxy(AuctionV3, []);
	await auctionV3.deployed();
	console.log('AuctionV3 deployed to:', auctionV3.address);
	await auctionV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	await auctionV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	await auctionV3.setPaymentMethod('0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp
	console.log('done');
}

main();
