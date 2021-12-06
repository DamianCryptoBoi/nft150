const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      let oldMarket = "0xcecd0487f7409753f4ee251499692cd03e0e1433";
      const polkaMarketV3 = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);

      console.log("---adminMigrateOrders---");
      const totalorder = await polkaMarketV3.totalOrders();
      console.log("---totalorder--- ", totalorder.toNumber());
      let stepMigrate = 1;
      let blockLoop = Math.ceil(totalorder/stepMigrate);
      for (i = 10; i < 20; i++) {
            await polkaMarketV3.adminMigrateOrders(oldMarket, i * stepMigrate, i * stepMigrate + stepMigrate - 1);
      }
      console.log("---Finish adminMigrateOrders---");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });