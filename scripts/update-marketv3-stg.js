const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

      await polkaMarketV3.setReferralContract("0x6602e019fE2F8b8b5104BA8fd89BF5606086e901");
      await polkaMarketV3.addPOLKANFTs("0x8d888ff4e7Bb0f6A02a2c397CB4fF83C27801387", true, false);
      await polkaMarketV3.addPOLKANFTs("0x346840b84575F5cB00E20fB2Ca306801E02aA68a", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // eth
            true);

      await polkaMarketV3.setPaymentMethod(
            "0xbec758b709075141c71e1011b3E5ecea9c3cbc0b", // XP polka
            true);

        //Migrate Data
      let oldMarket = "0xEccB8dB518ac6eC34074f375A38F46A0922eF034";
      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);

      
      console.log("---adminMigrateOrders---");
      const totalorder = await oldMarketContract.totalOrders();
      console.log("---totalorder--- ", totalorder);
      let blockLoop = Math.ceil(totalorder/10);
      for (i = 0; i < blockLoop; i++) {
            await polkaMarketV3.adminMigrateOrders(oldMarket, i * 10, i * 10 + 10);
      }
      console.log("---Finish adminMigrateOrders---");

      console.log("---adminMigrateBids---");
      const totalBid = await oldMarketContract.totalBids();
      let blockLoopBid = Math.ceil(totalBid/10);
      console.log("---totalBid--- ", totalBid);
      for (i = 0; i < blockLoop; i++) {
            await polkaMarketV3.adminMigrateBids(oldMarket, i * 10, i * 10 + 10);
      }
      console.log("---Finish adminMigrateBids---");

      console.log("---adminMigratePushNFT---");
      for (i = 0; i < blockLoop; i++) {
            await oldMarketContract.adminMigratePushNFT(polkaMarketV3.address, i * 10, i * 10 + 10);
      }
      console.log("---Finish adminMigratePushNFT---");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });