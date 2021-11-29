const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //StakingPool
      const MockWETH = await hre.ethers.getContractFactory("MockWETH");
      const mockWETH = await MockWETH.deploy();
      await mockWETH.deployed();
      console.log("MockWETH deployed at: ", mockWETH.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });