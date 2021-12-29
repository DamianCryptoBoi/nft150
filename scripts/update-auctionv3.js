const hre = require("hardhat")

const main = async () => {
      console.log("--- Start update DEV and STG ethereum ---");
      const [admin] = await hre.ethers.getSigners();

      const AuctionV3 = await hre.ethers.getContractFactory("AuctionV3");
      const auctionV3 = await AuctionV3.deploy();
      await auctionV3.deployed();
      console.log("AUCTION_CONTRACT deployed at: ", auctionV3.address);

      await auctionV3.setPaymentMethod("0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e", true); // usdt
      await auctionV3.setPaymentMethod("0x0000000000000000000000000000000000000000", true); //eth
      await auctionV3.setPaymentMethod("0xbec758b709075141c71e1011b3E5ecea9c3cbc0b", true); //xp
      console.log("Finish!!!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });