const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0x35fCD87F666F396b4efdd3889Fa379ca87f44C98");
      await polkaMarketV3.addPOLKANFTs("0xd13957599fb75c9cAed1AB7Afd4c4E06d06775Ca", true, false);
      await polkaMarketV3.addPOLKANFTs("0x749bDDc338c0b217E46D9fAB6843866255C400f8", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // eth
            true);

        //Migrate Data
      let oldMarket = "0x9507a3bA03F7a06e60E7e80Bf80E5D5fAb37F962";

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