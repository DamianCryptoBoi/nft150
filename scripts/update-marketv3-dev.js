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

//		POLKA721_CONTRACT deployed at:  0x4d5c11441057A570D637Eab4Be2F7c26f2F5F187
//		POLKA1155_CONTRACT (is contract of farm)  deployed at:  0x12ECCB267AFaa23717962B6191A02768B8B6d48f
//		ERC1155_CONTRACT deployed at:  0x38723E4fA9D3be89bf3BA3933a972cdB3e80923B
//		MARKET_CONTRACT deployed at:  0xf8D0967dBED9F989E91DbA5581CF5694009fb020
//		REFERRAL_CONTRACT deployed at:  0x9D54858F5b837a4B41AfafC3361Ec48345B469EE

      //PolkaMarketV3
      const PolkaMarketV3 = await hre.ethers.getContractFactory("MarketV3");
      const polkaMarketV3 = await PolkaMarketV3.deploy();
      await polkaMarketV3.deployed();
      console.log("MARKET_CONTRACT deployed at: ", polkaMarketV3.address);

//      await polkaMarketV3.setReferralContract(polkaReferral.address);
//      await polkaMarketV3.addPOLKANFTs(polka1155.address, true, true);
//      await polkaMarketV3.addPOLKANFTs(polka721General.address, true, false);
//      await polkaMarketV3.addPOLKANFTs(nft150.address, true, false);

      await polkaMarketV3.setReferralContract("0xdd798BfA0aE79F189C777736d076f64bB2d46eDe");
//      await polkaMarketV3.addPOLKANFTs("0x91d5520d004Ce4fcc3F18D26666052C5b1a6eB26", true, true); //farm
      await polkaMarketV3.addPOLKANFTs("0x19b07CBD89512f536855b8531fe682F114B02D65", true, false);
      await polkaMarketV3.addPOLKANFTs("0xBC8B1Cc6df591279Ad301c26e32b9a420eA749C2", true, false);

      await polkaMarketV3.setPaymentMethod(
            "0xEA040dB91b2FB439857145D3e660ceE46f458F94", // usdt
            true);


      await polkaMarketV3.setPaymentMethod(
            "0xc778417e063141139fce010982780140aa0cd5ab", // bnb
            true);

      await polkaMarketV3.setPaymentMethod(
            "0x0000000000000000000000000000000000000000", // eth
            true);

//      await polkaMarketV3.setProfitSenderContract(
//            "0xaa3b9832C4752e92e875b574D7c0cFC9FF52b445" // setProfitSenderContract
//            );

//      await polkaMarketV3.setPolkaExchangeContract(
//            "0xEC818116ddC366AE113A457be0C9416fB180c94a" // setPolkaExchangeContract
//            );

        //Migrate Data
      let oldMarket = "0x06e26C7C8Fa127094c5e7Dafc80E65BdFA6c46CF";
      //await polkaMarketV3.setApproveForAll("0x1C9040945f0F8F5642262B36453087e18297F4d9", polkaMarketV3.address);  //need for Deploy
      //await polkaMarketV3.setApproveForAll("0x1C9040945f0F8F5642262B36453087e18297F4d9", oldMarket);  //need for Deploy

      const oldMarketContract = await hre.ethers.getContractAt("MarketV3", oldMarket, admin);
      await oldMarketContract.setApproveForAll("0x19b07CBD89512f536855b8531fe682F114B02D65", polkaMarketV3.address);
      await oldMarketContract.setApproveForAllERC721("0xBC8B1Cc6df591279Ad301c26e32b9a420eA749C2", polkaMarketV3.address);
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