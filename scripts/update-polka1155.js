const hre = require("hardhat");

const main = async () => {
        const [admin] = await hre.ethers.getSigners();

        const Polka1155 = await hre.ethers.getContractFactory("Polka1155");
        const polka1155 = await Polka1155.deploy();
        await polka1155.deployed();
        console.log("Polka1155 deployed at: ", polka1155.address);

        const polkaMarketV2 = await hre.ethers.getContractAt("PolkaMarketV2",  "0xB60E67DCef8989783FA7e8a8b0080b894A397e10", admin);
        await polkaMarketV2.addPOLKANFTs(polka1155.address, true, true);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });