const hre = require("hardhat")

//const SotaMarketV2 = artifacts.require("SotaMarketV2.sol");
//const Sota721General = artifacts.require("Sota721General");
//const SOTAReferral = artifacts.require("SOTAReferral");
//const SOTAExchange = artifacts.require("SOTAExchange");
//const ProfitEstimator = artifacts.require("ProfitEstimator");



const main = async () => {
      const [admin] = await hre.ethers.getSigners();


//    address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3
//    address public usdt; // 0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684 => get price
//    address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 => compare with payment token market
//    address public busd; // 0x78867bbeef44f2326bf8ddd1941a4439382ef2a7
//    address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd


      //Sota721General
      const Sota721General = await hre.ethers.getContractFactory("Sota721General");
      const sota721General = await Sota721General.deploy();
      await sota721General.deployed();
      console.log("Sota721General deployed at: ", sota721General.address);

      //sota1155
      const Sota1155 = await hre.ethers.getContractFactory("Sota1155");
      const sota1155 = await Sota1155.deploy();
      await sota1155.deployed();
      console.log("Sota1155 deployed at: ", sota1155.address);

//    //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy();
      await nft150.deployed();
      console.log("NFT150 deployed at: ", nft150.address);

      //SotaMarketV2
      const SotaMarketV2 = await hre.ethers.getContractFactory("SotaMarketV2");
      const sotaMarketV2 = await SotaMarketV2.deploy();
      await sotaMarketV2.deployed();
      console.log("sotaMarketV2 deployed at: ", sotaMarketV2.address);

      //SOTAReferral
      const SOTAReferral = await hre.ethers.getContractFactory("SOTAReferral");
      const sotaReferral = await SOTAReferral.deploy();
      await sotaReferral.deployed();
      console.log("SOTAReferral deployed at: ", sotaReferral.address);

      //SOTAExchangeV2
      const SOTAExchangeV2 = await hre.ethers.getContractFactory("SOTAExchangeV2");
      const sotaExchangeV2 = await SOTAExchangeV2.deploy(
        "0x9ac64cc6e4415144c455bd8e4837fea55603e5c3",
        "0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684",
        "0x78867bbeef44f2326bf8ddd1941a4439382ef2a7",
        "0xae13d989dac2f0debff460ac112a837c89baa7cd"
      );
      await sotaExchangeV2.deployed();
      console.log("SOTAEV2xchange deployed at: ", sotaExchangeV2.address);
      await sotaExchangeV2.setUsdtMarket("0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893");


      //ProfitEstimator
      const ProfitEstimator = await hre.ethers.getContractFactory("ProfitEstimator");
      const profitEstimator = await ProfitEstimator.deploy(sotaMarketV2.address, sotaExchangeV2.address);
      await profitEstimator.deployed();
      console.log("ProfitEstimator deployed at: ", profitEstimator.address);

      //BSotaToken
      const BSotaToken = await hre.ethers.getContractFactory("BSotaToken");
      const bSotaToken = await BSotaToken.deploy();
      await bSotaToken.deployed();
      console.log("bSotaToken deployed at: ", bSotaToken.address);

      // sotaMarket.whiteListOperator //TODO
      // sotaMarket.addSOTANFTs //TODO
      //0xa0e7fe8176135C12657f54F41DF5851F22C868B3 sota721General.address

      await sotaMarketV2.setReferralContract(sotaReferral.address);
      await sotaMarketV2.addSOTANFTs(sota1155.address, true, true);
      await sotaMarketV2.addSOTANFTs(sota721General.address, true, false);
      await sotaMarketV2.addSOTANFTs(nft150.address, true, false);

      //StakingPool
      const StakingPool = await hre.ethers.getContractFactory("StakingPool");
      const stakingPool = await StakingPool.deploy(nft150.address, bSotaToken.address);
      await stakingPool.deployed();
      console.log("StakingPool deployed at: ", stakingPool.address);

//    Testnet

//	address public USDT = 0x584119951fA66bf223312A29FB6EDEBdd957C5d8;
//	address public WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;

      await sotaMarketV2.setPaymentMethod(
            "0x14ec6EE23dD1589ea147deB6c41d5Ae3d6544893", // usdt
            true);

      await sotaMarketV2.setPaymentMethod(
            bSotaToken.address, // sota
            true);

      await sotaMarketV2.setPaymentMethod(
            "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // bnb
            true);

      await sotaMarketV2.setSotaContract(
            bSotaToken.address // TODO waiting QA Bsotatoken
            );

      await sotaMarketV2.setProfitSenderContract(
            profitEstimator.address // setProfitSenderContract
            );

      await sotaMarketV2.setSotaExchangeContract(
            sotaExchangeV2.address // setSotaExchangeContract
            );

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });