const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      //StakingPool
      const StakingPool = await hre.ethers.getContractFactory("MockERC20");
      const stakingPool = await StakingPool.deploy("0xF84493E5c72Be0E3944C0B780BF12218300c77Cb", "0xe6Da7D2a724F21Efe0e6fd4Da2Af21375e6B8bf9");
      await stakingPool.deployed();
      console.log("StakingPool deployed at: ", stakingPool.address);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });