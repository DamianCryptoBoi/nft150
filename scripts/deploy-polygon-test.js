const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();


//    //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy();
      await nft150.deployed();
      console.log("ERC1155_CONTRACT deployed at: ", nft150.address);


//      await marketV3.setProfitSenderContract(
//            profitEstimator.address // setProfitSenderContract
//            );

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });