const { ethers } = require('hardhat');

async function main() {
	const PolkaReferral = await hre.ethers.getContractFactory('PolkaReferral');
	const polkaReferral = await PolkaReferral.deploy();
	await polkaReferral.deployed();

	const MarketV3 = await hre.ethers.getContractFactory('MarketV3');
	const marketV3 = await MarketV3.deploy();
	await marketV3.deployed();
	console.log('MARKET_CONTRACT deployed at: ', marketV3.address);

	console.log('Setting market');
	await marketV3.setReferralContract(polkaReferral.address);
	// await marketV3.addPOLKANFTs(polka721General.address, true, false);
	// await marketV3.addPOLKANFTs(nft150.address, true, false);
	//eth
	// await marketV3.setPaymentMethod('0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e', true); // usdt
	// await marketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); //eth
	// await marketV3.setPaymentMethod('0xbec758b709075141c71e1011b3E5ecea9c3cbc0b', true); //xp
	//BSC
	// await marketV3.setPaymentMethod('0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1', true); // usdt
	// await marketV3.setPaymentMethod('0x0000000000000000000000000000000000000000', true); // bnb
	//polygon
	await marketV3.setPaymentMethod('0xc592b11915e3f8F963F3aE2170b530E38319b388', true); // usdt
	await marketV3.setPaymentMethod('0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6', true); //eth
	console.log('done');
}

main();
