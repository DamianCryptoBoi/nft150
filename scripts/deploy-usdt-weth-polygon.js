const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      const MockUSDT = await hre.ethers.getContractFactory("UChildERC20");
      const mockUSDT = await MockUSDT.deploy();
      await mockUSDT.deployed();
      console.log("mockUSDT deployed at: ", mockUSDT.address);

      await mockUSDT.initialize("USDT", "USDT", 6, admin.address);

      const MockWETH = await hre.ethers.getContractFactory("MaticWETH");
      const mockWETH = await MockWETH.deploy(admin.address);
      await mockWETH.deployed();
      console.log("mockWETH deployed at: ", mockWETH.address);
      
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });