const hre = require("hardhat");

const main = async () => {
        const [admin] = await hre.ethers.getSigners();

        const Sota1155 = await hre.ethers.getContractFactory("Sota1155");
        const sota1155 = await Sota1155.deploy();
        await sota1155.deployed();
        console.log("Sota1155 deployed at: ", sota1155.address);

        const sotaMarketV2 = await hre.ethers.getContractAt("SotaMarketV2",  "0xB60E67DCef8989783FA7e8a8b0080b894A397e10", admin);
        await sotaMarketV2.addSOTANFTs(sota1155.address, true, true);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });