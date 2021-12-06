const hre = require("hardhat")

const main = async () => {
      console.log("--- Start Deploy staging ---");
      const [admin] = await hre.ethers.getSigners();

      //MarketV3
      const MarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const marketV3 = await MarketV3.deploy();
      await marketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", marketV3.address);

      await marketV3.setReferralContract("0x54eDEaFF620AC9e6295df132d381883d033e784C");
      await marketV3.addPOLKANFTs("0xfBdd4448A593D316eD995E7507A0C1C24ED20772", true, false);
      await marketV3.addPOLKANFTs("0xDA174A9A304f6003F8D3181d3e68D5DCF3031065", true, false);

      await marketV3.setPaymentMethod(
            "0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e", // usdt
            true);

      await marketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // ETH
            true);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });