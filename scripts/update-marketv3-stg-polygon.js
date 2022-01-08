const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      let oldMarket = "0x53baBF4385d5d40c159452F43922214C4fCf3A7f";
      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);
      await oldMarketContract.pause();
      console.log("oldMarketContract paused");

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0xEC2808464Eb32cf413C288F33d1d45b3766B178e");

      await polkaMarketV3.setPaymentMethod(
            "0xc592b11915e3f8F963F3aE2170b530E38319b388", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6", // weth
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