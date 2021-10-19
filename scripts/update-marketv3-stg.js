const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0xEb50f8b497e65e20Ce8f27951B9F034380070542");
      await polkaMarketV3.addPOLKANFTs("0x44CAE0Fea77Bc76575ae4Fcef56C1f903caB57B2", true, false);
      await polkaMarketV3.addPOLKANFTs("0x5F9eF767b409dBA5efc22E32ee46785868AD1C3a", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // eth
            true);

        //Migrate Data
      let oldMarket = "0x80C20Aab0d9B09e4AF8cC0A7533e506b372e8BDD";

      console.log("---adminMigrateOrders---");
      await polkaMarketV3.adminMigrateOrders(oldMarket);
      console.log("---Finish adminMigrateOrders---");

      console.log("---adminMigrateBids---");
      await polkaMarketV3.adminMigrateBids(oldMarket);
      console.log("---Finish adminMigrateBids---");

      console.log("---adminMigratePushNFT---");
      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);
      await oldMarketContract.adminMigratePushNFT(polkaMarketV3.address);
      console.log("---Finish adminMigratePushNFT---");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });