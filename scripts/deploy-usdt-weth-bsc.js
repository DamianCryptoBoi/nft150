const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
      const mockUSDT = await MockUSDT.deploy();
      await mockUSDT.deployed();
      console.log("mockUSDT deployed at: ", mockUSDT.address);

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