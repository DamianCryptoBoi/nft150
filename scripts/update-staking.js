const hre = require("hardhat");

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

//      NFT150 deployed at:  0xF84493E5c72Be0E3944C0B780BF12218300c77Cb
//      bPolkaToken deployed at:  0xe6Da7D2a724F21Efe0e6fd4Da2Af21375e6B8bf9

      //StakingPool
      const StakingPool = await hre.ethers.getContractFactory("StakingPool");
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