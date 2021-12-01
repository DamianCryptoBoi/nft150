const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      // let oldMarket = "0xA90da68CEDb626514df8236f35B17A2763B53c16";
      let oldMarket = "0xcEcd0487f7409753f4EE251499692cd03E0e1433";
      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);
      await oldMarketContract.pause();
      console.log("oldMarketContract paused");

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0x54eDEaFF620AC9e6295df132d381883d033e784C");
      await polkaMarketV3.addPOLKANFTs("0xfBdd4448A593D316eD995E7507A0C1C24ED20772", true, false);
      await polkaMarketV3.addPOLKANFTs("0xDA174A9A304f6003F8D3181d3e68D5DCF3031065", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // eth
            true);

      await polkaMarketV3.setPaymentMethod(
            "0xbec758b709075141c71e1011b3E5ecea9c3cbc0b", // XP polka
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