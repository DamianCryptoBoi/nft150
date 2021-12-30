const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      let oldMarket = "0xB7a807619f76f8A2144d2266647d69DD2e1EF208";
      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);
      await oldMarketContract.pause();
      console.log("oldMarketContract paused");

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0x62683A80efF01d77577aE0b2581a92213BE98e93");

      await polkaMarketV3.setPaymentMethod(
            "0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // bnb
            true);

      //Migrate Data
            
      console.log("---adminMigrateOrders---");
      const totalOrder = await oldMarketContract.totalOrders();
      console.log("---totalorder--- ", totalOrder.toNumber());
      let stepMigrate = 1;
      let blockLoop = Math.ceil(totalOrder/stepMigrate);
      for (i = 0; i < blockLoop; i++) {
            await polkaMarketV3.adminMigrateOrders(oldMarket, i * stepMigrate, i * stepMigrate + stepMigrate - 1);
            console.log("---Order id migrated: --- ", i);
      }
      console.log("---Finish adminMigrateOrders---");

      console.log("---adminMigrateBids---");
      const totalBid = await oldMarketContract.totalBids();
      let blockLoopBid = Math.ceil(totalBid/10);
      console.log("---totalBid--- ", totalBid.toNumber());
      for (i = 0; i < blockLoopBid; i++) {
            await polkaMarketV3.adminMigrateBids(oldMarket, i * 10, i * 10 + 10 - 1);
      }
      console.log("---Finish adminMigrateBids---");

      console.log("---adminMigratePushNFT---");
      let stepMigrateNFT = 10;
      let blockLoopNFT = Math.ceil(totalOrder/stepMigrateNFT);
      for (i = 0; i < blockLoopNFT; i++) {
            await oldMarketContract.adminMigratePushNFT(polkaMarketV3.address, i * stepMigrateNFT, i * stepMigrateNFT + stepMigrateNFT -1);
      }
      console.log("---Finish adminMigratePushNFT---");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });