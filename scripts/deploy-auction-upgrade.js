const { ethers, upgrades } = require('hardhat');

AUCTION_PROXY_ADDRESS = '0xebfC3616A9DFC8Cd3DB60a2316711e3E6D987fE1';

async function main() {
	const AuctionV3x = await ethers.getContractFactory('AuctionV3');
	const auctionV3x = await upgrades.upgradeProxy(AUCTION_PROXY_ADDRESS, AuctionV3x);
	await auctionV3x.deployed();
	console.log('AuctionV3 upgraded ', auctionV3x.address);
}

main();
