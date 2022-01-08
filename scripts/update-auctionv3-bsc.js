const hre = require("hardhat")

const main = async () => {
      console.log("--- Start update DEV and STG BSC ---");
      const [admin] = await hre.ethers.getSigners();

      const AuctionV3 = await hre.ethers.getContractFactory("AuctionV3");
      const auctionV3 = await AuctionV3.deploy();
      await auctionV3.deployed();
      console.log("AUCTION_CONTRACT deployed at: ", auctionV3.address);

      await auctionV3.setPaymentMethod("0x4Af96f000b0Df70E99dd06ea6cE759aFCd331cC1", true); // usdt
      await auctionV3.setPaymentMethod("0x0000000000000000000000000000000000000000", true); // bnb
      console.log("Finish!!!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });