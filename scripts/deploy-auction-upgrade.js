const { ethers, upgrades } = require('hardhat');

AUCTION_PROXY_ADDRESS = '';

async function main() {
	const AuctionV3x = await ethers.getContractFactory('AuctionV3x');
	const auctionV3x = await upgrades.upgradeProxy(AUCTION_PROXY_ADDRESS, AuctionV3x);
	await auctionV3x.deployed();
	console.log('AuctionV3 upgraded ', auctionV3x.address);
}

main();
