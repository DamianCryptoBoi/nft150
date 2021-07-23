const hre = require("hardhat")

//const SotaMarketV2 = artifacts.require("SotaMarketV2.sol");
//const Sota721General = artifacts.require("Sota721General");
//const SOTAReferral = artifacts.require("SOTAReferral");
//const SOTAExchange = artifacts.require("SOTAExchange");
//const ProfitEstimator = artifacts.require("ProfitEstimator");



const main = async () => {
      const [admin] = await hre.ethers.getSigners();

      const bnbRouter = '0x0000000000000000000000000000000000000000'; //TODO
      const usdt = '0x14ec6EE23dD1589ea147deB6c41d5Ae3d6544893'; //TODO
      const busd = '0x1a0B0c776950e31b05FB25e3d7E14f99592bFB71'; //TODO
      const bnb = '0xD5513cbe97986e7D366B8979D887CB76e441b148'; //TODO

       //TODO BSotaToken missing code?

      //Sota721General
      const Sota721General = await hre.ethers.getContractFactory("Sota721General");
      const sota721General = await Sota721General.deploy();
      await sota721General.deployed();
      console.log("Sota721General deployed at: ", sota721General.address);
      //1155
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy();
      await nft150.deployed();
      console.log("NFT150 deployed at: ", nft150.address);

      const contracOld = '0x7f61befffa9a8e584dd8d6d07b2d1e5ed16dd100';// TODO change Address (deprcation)
      const SotaMarketV2 = await hre.ethers.getContractFactory("SotaMarketV2");
      const sotaMarketV2 = await SotaMarketV2.deploy(contracOld);
      await sotaMarketV2.deployed();
      console.log("sotaMarketV2 deployed at: ", sotaMarketV2.address);

      //SOTAReferral
      const SOTAReferral = await hre.ethers.getContractFactory("SOTAReferral");
      const sotaReferral = await SOTAReferral.deploy();
      await sotaReferral.deployed();
      console.log("SOTAReferral deployed at: ", sotaReferral.address);

      //SOTAExchange
      const SOTAExchange = await hre.ethers.getContractFactory("SOTAExchange");
      const sotaExchange = await SOTAExchange.deploy();
      await sotaExchange.deployed();
      console.log("SOTAExchange deployed at: ", sotaExchange.address);

      //ProfitEstimator
      const ProfitEstimator = await hre.ethers.getContractFactory("ProfitEstimator");
      const profitEstimator = await ProfitEstimator.deploy(sotaMarketV2.address, sotaExchange.address);
      await profitEstimator.deployed();
      console.log("ProfitEstimator deployed at: ", profitEstimator.address);

      // sotaMarket.whiteListOperator //TODO
      // sotaMarket.addSOTANFTs //TODO
      //0xa0e7fe8176135C12657f54F41DF5851F22C868B3 sota721General.address

      await sotaMarketV2.setReferralContract(sotaReferral.address);
      await sotaMarketV2.addSOTANFTs(sota721General.address, true, true);
      await sotaMarketV2.addSOTANFTs(nft150.address, true, false);

//      await sotaMarketV2.setPaymentMethod(
//            "0x55d398326f99059ff775485246999027b3197955", // usdt
//            true);

//      await sotaMarketV2.setPaymentMethod(
//            "0x0742b62efb5f2eabbc14567dfc0860ce0565bcf4", // sota
//            true);

//      await sotaMarketV2.setPaymentMethod(
//            "0x0000000000000000000000000000000000000000", // bnb
//            true);

//      await sotaMarketV2.setSotaContract(
//            "0x0742b62efb5f2eabbc14567dfc0860ce0565bcf4" // TODO waiting QA Bsotatoken
//            );

      await sotaMarketV2.setProfitSenderContract(
            profitEstimator.address // setProfitSenderContract
            );

      await sotaMarketV2.setSotaExchangeContract(
            sotaExchange.address // setSotaExchangeContract
            );

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });