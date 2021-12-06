const hre = require("hardhat")

const main = async () => {
      console.log("--- Start Deploy ---");
      const [admin] = await hre.ethers.getSigners();

      //Polka721General
      const Erc20Token = await hre.ethers.getContractFactory("erc20Token");
      const erc20Token = await Erc20Token.deploy("PolkaFantasy", 'XP', admin.address, 2000000, 18);
      await erc20Token.deployed();
      console.log("POLKAFANTASY_CONTRACT deployed at: ", erc20Token.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });