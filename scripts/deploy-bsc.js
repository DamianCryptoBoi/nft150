const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      const PolkaURI = await hre.ethers.getContractFactory("PolkaURI");
      const polkaURI = await PolkaURI.deploy("https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/");
      await polkaURI.deployed();
      console.log("PolkaURI deployed at: ", polkaURI.address);

      //Polka721General
      const Polka721General = await hre.ethers.getContractFactory("Polka721General");
      const polka721General = await Polka721General.deploy(polkaURI.address);
      await polka721General.deployed();
      console.log("POLKA721_CONTRACT deployed at: ", polka721General.address);

      //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy(polkaURI.address);
      await nft150.deployed();
      console.log("ERC1155_CONTRACT deployed at: ", nft150.address);

      //MarketV3
      const MarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const marketV3 = await MarketV3.deploy();
      await marketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", marketV3.address);

      //PolkaReferral
      const PolkaReferral = await hre.ethers.getContractFactory("PolkaReferral");
      const polkaReferral = await PolkaReferral.deploy();
      await polkaReferral.deployed();
      console.log("REFERRAL_CONTRACT deployed at: ", polkaReferral.address);

      await marketV3.setReferralContract(polkaReferral.address);
      await marketV3.addPOLKANFTs(polka721General.address, true, false);
      await marketV3.addPOLKANFTs(nft150.address, true, false);

      await marketV3.setPaymentMethod(
            "0x8c9aB1ffa133B60FA38215D94032b23Caf431C4F", // usdt
            true);

      await marketV3.setPaymentMethod(
            "0x832161Faaff82A3af9f978F3b0c48915E89b8ea2", // wETH (https://mumbai.polygonscan.com/token/0x2d7882bedcbfddce29ba99965dd3cdf7fcb10a1e)
            true);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });