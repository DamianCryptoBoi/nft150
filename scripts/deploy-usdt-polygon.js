const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //StakingPool
      const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
      const mockUSDT = await MockUSDT.deploy();
      await mockUSDT.deployed();
      console.log("mockUSDT deployed at: ", mockUSDT.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });