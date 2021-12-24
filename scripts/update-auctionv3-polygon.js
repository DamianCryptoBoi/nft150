const hre = require("hardhat")

const main = async () => {
      console.log("--- Start update DEV and STG Polygon ---");
      const [admin] = await hre.ethers.getSigners();

      const AuctionV3 = await hre.ethers.getContractFactory("AuctionV3");
      const auctionV3 = await AuctionV3.deploy();
      await auctionV3.deployed();
      console.log("AUCTION_CONTRACT deployed at: ", auctionV3.address);

      // await auctionV3.setPaymentMethod("0xc592b11915e3f8F963F3aE2170b530E38319b388", true); // usdt
      // await auctionV3.setPaymentMethod("0xDcf1f7Dd2d11Be84C63cFd452B9d62520855a7F6", true); //eth
      console.log("Finish!!!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });