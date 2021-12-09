const hre = require("hardhat")

const main = async () => {
      console.log("--- Start Deploy DEV and STG ---");
      const [admin] = await hre.ethers.getSigners();

// ETH rinkeby:
//    address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3 ==> uniswap: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
//    address public usdt; // 0xEA040dB91b2FB439857145D3e660ceE46f458F94 ==> get price
//    address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 ==> compare with payment token market => use usdt 0xEA040dB91b2FB439857145D3e660ceE46f458F94
//    address public busd; // 0x3b00ef435fa4fcff5c209a37d1f3dcff37c705ad
//    address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd ==> wbnb chuyển sang weth: 0xc778417e063141139fce010982780140aa0cd5ab

      const PolkaURI = await hre.ethers.getContractFactory("PolkaURI");
      const polkaURI = await PolkaURI.deploy("https://yng30mk417.execute-api.ap-southeast-1.amazonaws.com/v1/");
      await polkaURI.deployed();
      console.log("PolkaURI deployed at: ", polkaURI.address);

      //Polka721General
      const Polka721General = await hre.ethers.getContractFactory("Polka721General");
      const polka721General = await Polka721General.deploy(polkaURI.address);
      await polka721General.deployed();
      console.log("POLKA721_CONTRACT deployed at: ", polka721General.address);

//    //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy(polkaURI.address);
      await nft150.deployed();
      console.log("ERC1155_CONTRACT deployed at: ", nft150.address);

      //MarketV3
      const MarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const marketV3 = await MarketV3.deploy();
      await marketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", marketV3.address);

      //AuctionV3
      const AuctionV3 = await hre.ethers.getContractFactory("AuctionV3");
      const auctionV3 = await AuctionV3.deploy();
      await auctionV3.deployed();
      console.log("AUCTION_CONTRACT deployed at: ", auctionV3.address);

      //PolkaReferral
      const PolkaReferral = await hre.ethers.getContractFactory("PolkaReferral");
      const polkaReferral = await PolkaReferral.deploy();
      await polkaReferral.deployed();
      console.log("REFERRAL_CONTRACT deployed at: ", polkaReferral.address);

      console.log("Setting market");
      await marketV3.setReferralContract(polkaReferral.address);
      await marketV3.addPOLKANFTs(polka721General.address, true, false);
      await marketV3.addPOLKANFTs(nft150.address, true, false);
      await marketV3.setPaymentMethod("0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e", true); // usdt
      await marketV3.setPaymentMethod("0x0000000000000000000000000000000000000000", true); //eth
      await marketV3.setPaymentMethod("0xbec758b709075141c71e1011b3E5ecea9c3cbc0b", true); //xp

      console.log("Setting Auction");
      await auctionV3.setReferralContract(polkaReferral.address);
      await auctionV3.addPOLKANFTs(polka721General.address, true);
      await auctionV3.addPOLKANFTs(nft150.address, true);
      await auctionV3.setPaymentMethod("0xd35d2e839d888d1cDBAdef7dE118b87DfefeD20e", true); // usdt
      await auctionV3.setPaymentMethod("0x0000000000000000000000000000000000000000", true); //eth
      await auctionV3.setPaymentMethod("0xbec758b709075141c71e1011b3E5ecea9c3cbc0b", true); //xp

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });