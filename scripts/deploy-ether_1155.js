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


//    //NFT150
      const NFT150 = await hre.ethers.getContractFactory("NFT150");
      const nft150 = await NFT150.deploy();
      await nft150.deployed();
      console.log("ERC1155_CONTRACT deployed at: ", nft150.address);

      const MarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const marketV3 = await MarketV3.deploy();
      await marketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", marketV3.address);

      await marketV3.addPOLKANFTs(nft150.address, true, false);

      await marketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // ETH
            true);

      await nft150.setApprovalForAll(
            marketV3.address, // ETH
            true);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });