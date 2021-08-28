const hre = require("hardhat")

const main = async () => {
      const [admin] = await hre.ethers.getSigners();

// ETH rinkeby:
//    address public bnbRouter; // 0x9ac64cc6e4415144c455bd8e4837fea55603e5c3 ==> uniswap: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
//    address public usdt; // 0xEA040dB91b2FB439857145D3e660ceE46f458F94 ==> get price
//    address public usdtMarket; // 0x14ec6ee23dd1589ea147deb6c41d5ae3d6544893 ==> compare with payment token market => use usdt 0xEA040dB91b2FB439857145D3e660ceE46f458F94
//    address public busd; // 0x3b00ef435fa4fcff5c209a37d1f3dcff37c705ad
//    address public bnb; // 0xae13d989dac2f0debff460ac112a837c89baa7cd ==> wbnb chuyển sang weth: 0xc778417e063141139fce010982780140aa0cd5ab

//Polka721General deployed at:  0x2aa587BE42fDb7613A0eA5C6829D46880717C869
//Polka1155 deployed at:  0x91d5520d004Ce4fcc3F18D26666052C5b1a6eB26 -> farm -> POLKA1155_CONTRACT  is contract of farm
//NFT150 deployed at:  0x1C9040945f0F8F5642262B36453087e18297F4d9 -> ERC1155_CONTRACT  put on sale
//polkaMarketV3 deployed at:  0xc86e8841d0821eF4686f0A5Ef0EB2722E969d5Aa
//POLKAReferral deployed at:  0x24513e856d5ffCB281d96B91274501b531af3F25
//POLKAEV2xchange deployed at:  0xEC818116ddC366AE113A457be0C9416fB180c94a
//ProfitEstimator deployed at:  0xaa3b9832C4752e92e875b574D7c0cFC9FF52b445
//bPolkaToken deployed at:  0x7635e7A7d8B9C30887323B7D735877ba6cFA8Ba5
//StakingPool deployed at:  0xD8000217dd6dF6C263929875D8b73e12E88d794f

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

//      await polkaMarketV3.setReferralContract(polkaReferral.address);
//      await polkaMarketV3.addPOLKANFTs(polka1155.address, true, true);
//      await polkaMarketV3.addPOLKANFTs(polka721General.address, true, false);
//      await polkaMarketV3.addPOLKANFTs(nft150.address, true, false);

      await polkaMarketV3.setReferralContract("0x24513e856d5ffCB281d96B91274501b531af3F25");
      await polkaMarketV3.addPOLKANFTs("0x91d5520d004Ce4fcc3F18D26666052C5b1a6eB26", true, true);
      await polkaMarketV3.addPOLKANFTs("0x2aa587BE42fDb7613A0eA5C6829D46880717C869", true, false);
      await polkaMarketV3.addPOLKANFTs("0x1C9040945f0F8F5642262B36453087e18297F4d9", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x7635e7A7d8B9C30887323B7D735877ba6cFA8Ba5", // polka
            true);

      await polkaMarketV3.setPaymentMethod(
            "0xc778417e063141139fce010982780140aa0cd5ab", // bnb
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // bnb
            true);

//      await polkaMarketV3.setPolkaContract(
//            "0x7635e7A7d8B9C30887323B7D735877ba6cFA8Ba5" // TODO waiting QA Bpolkatoken
//            );

      await polkaMarketV3.setProfitSenderContract(
            "0xaa3b9832C4752e92e875b574D7c0cFC9FF52b445" // setProfitSenderContract
            );

//      await polkaMarketV3.setPolkaExchangeContract(
//            "0xEC818116ddC366AE113A457be0C9416fB180c94a" // setPolkaExchangeContract
//            );

        //Migrate Data
      let oldMarket = "0x5B25ea3d6F615A81Ea9a5E502259F300017a6b49";
      //await polkaMarketV3.setApproveForAll("0x1C9040945f0F8F5642262B36453087e18297F4d9", polkaMarketV3.address);  //need for Deploy
      //await polkaMarketV3.setApproveForAll("0x1C9040945f0F8F5642262B36453087e18297F4d9", oldMarket);  //need for Deploy

      const oldMarketContract = await hre.ethers.getContractAt("MarketV3",  oldMarket, admin);
      await oldMarketContract.setApproveForAll("0x1C9040945f0F8F5642262B36453087e18297F4d9", polkaMarketV3.address);
      await oldMarketContract.setApproveForAllERC721("0x2aa587BE42fDb7613A0eA5C6829D46880717C869", polkaMarketV3.address);
      //await polkaMarketV3.setApproveForAllERC721("0x2aa587BE42fDb7613A0eA5C6829D46880717C869", polkaMarketV3.address); //need for Deploy
//      const polka721General = await hre.ethers.getContractAt("Polka721General",  "0x2aa587BE42fDb7613A0eA5C6829D46880717C869", admin);
//      await polka721General.setApprovalForAll(polkaMarketV3.address, true);

      console.log("---adminMigrateOrders---");
      await polkaMarketV3.adminMigrateOrders(
            oldMarket // old market address
            );
      console.log("---Finis adminMigrateOrders---");

      console.log("---adminMigrateBids---");
      await polkaMarketV3.adminMigrateBids(
            oldMarket // old market address
            );
      console.log("---Finis adminMigrateBids---");

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });