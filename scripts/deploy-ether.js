const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

// ETH rinkeby:
//    address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3 ==> uniswap: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
//    address public usdt; // 0xEA040dB91b2FB439857145D3e660ceE46f458F94 ==> get price
//    address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 ==> compare with payment token market => use usdt 0xEA040dB91b2FB439857145D3e660ceE46f458F94
//    address public busd; // 0x3b00ef435fa4fcff5c209a37d1f3dcff37c705ad
//    address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd ==> wbnb chuyển sang weth: 0xc778417e063141139fce010982780140aa0cd5ab

      //Polka721General
      const Polka721General = await hre.ethers.getContractFactory("Polka721General");
      const polka721General = await Polka721General.deploy();
      await polka721General.deployed();
      console.log("POLKA721_CONTRACT deployed at: ", polka721General.address);

      //polka1155
//      const Polka1155 = await hre.ethers.getContractFactory("Polka1155");
//      const polka1155 = await Polka1155.deploy();
//      await polka1155.deployed();
//      console.log("POLKA1155_CONTRACT (is contract of farm)  deployed at: ", polka1155.address);

//    //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy();
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

      //POLKAExchangeV2
//      const PolkaExchangeV2 = await hre.ethers.getContractFactory("PolkaExchangeV2");
//      const polkaExchangeV2 = await POLKAExchangeV2.deploy(
//        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
//        "0xEA040dB91b2FB439857145D3e660ceE46f458F94",
//        "0x3b00ef435fa4fcff5c209a37d1f3dcff37c705ad",
//        "0xc778417e063141139fce010982780140aa0cd5ab"
//      );
//      await polkaExchangeV2.deployed();
//      console.log("POLKAV2xchange deployed at: ", polkaExchangeV2.address);
//      await polkaExchangeV2.setUsdtMarket("0xEA040dB91b2FB439857145D3e660ceE46f458F94");

      //ProfitEstimator
//      const ProfitEstimator = await hre.ethers.getContractFactory("ProfitEstimator");
//      const profitEstimator = await ProfitEstimator.deploy(marketV3.address, polkaExchangeV2.address);
//      await profitEstimator.deployed();
//      console.log("ProfitEstimator deployed at: ", profitEstimator.address);

//      //BNFT150Token
//      const BNFT150Token = await hre.ethers.getContractFactory("BNFT150Token");
//      const bNFT150Token = await BNFT150Token.deploy();
//      await bNFT150Token.deployed();
//      console.log("POLKA_CONTRACT deployed at: ", bNFT150Token.address);


      //0xa0e7fe8176135C12657f54F41DF5851F22C868B3 polka721General.address

      await marketV3.setReferralContract(polkaReferral.address);
//      await marketV3.addPOLKANFTs(polka1155.address, true, true);
      await marketV3.addPOLKANFTs(polka721General.address, true, false);
      await marketV3.addPOLKANFTs(nft150.address, true, false);

      //StakingPool
//      const StakingPool = await hre.ethers.getContractFactory("StakingPool");
//      const stakingPool = await StakingPool.deploy(nft150.address, bNFT150Token.address);
//      await stakingPool.deployed();
//      console.log("STAKING_CONTRACT deployed at: ", stakingPool.address);

//    Testnet

//	address public USDT = 0x584119951fA66bf223312A29FB6EDEBdd957C5d8;
//	address public WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;

      await marketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);

      await marketV3.setPaymentMethod(
            "0xc778417e063141139fce010982780140aa0cd5ab", // bnb
            true);

      await marketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // ETH
            true);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });