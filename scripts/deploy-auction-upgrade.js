const { ethers, upgrades } = require('hardhat');

AUCTION_PROXY_ADDRESS = '0x8e0B8A47e5B35DB6B469654555CF5177BE84a4aB';

async function main() {
	const AuctionV3x = await ethers.getContractFactory('AuctionV3');
	const auctionV3x = await upgrades.upgradeProxy(AUCTION_PROXY_ADDRESS, AuctionV3x);
	await auctionV3x.deployed();
	console.log('AuctionV3 upgraded ', auctionV3x.address);
}

main();
