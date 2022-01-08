const { ethers, upgrades } = require('hardhat');

async function main() {
	const AuctionV3 = await ethers.getContractFactory('AuctionV3');
	const auctionV3 = await upgrades.deployProxy(AuctionV3, []);
	await auctionV3.deployed();
	console.log('AuctionV3 deployed to:', auctionV3.address);
}

main();
