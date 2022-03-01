const { ethers } = require('hardhat');

async function main() {
	const XP = await hre.ethers.getContractFactory('erc20Token');
	const xp = await XP.deploy(
		'PolkaFantasy',
		'XP',
		'0x34B7E52B8b590cc1C5896687019dc12843471536',
		'200000000000000000000000000',
		18
	);
	await xp.deployed();

	console.log(`XP: ${xp.address}`);

	// testBsc: 0x0645E7beF4917206594Be673d96002D5b1821C7d

	// mumbai: 0x415B80Bc57231CFC86a5929F654c0eE461bDF398
}

main();
