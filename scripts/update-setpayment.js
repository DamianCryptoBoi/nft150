//const hre = require("hardhat");
//
//const main = async () => {
//      const [admin] = await hre.ethers.getSigners();
//
////      const bnbRouter = '0x0000000000000000000000000000000000000000'; //TODO
////      const usdt = '0x14ec6EE23dD1589ea147deB6c41d5Ae3d6544893'; //TODO -> using
////      const busd = '0x1a0B0c776950e31b05FB25e3d7E14f99592bFB71'; //TODO
////      const bnb = '0xD5513cbe97986e7D366B8979D887CB76e441b148'; //TODO
//
//      const marketV2 = await hre.ethers.getContractAt("MarketV3",  "0xB60E67DCef8989783FA7e8a8b0080b894A397e10", admin);
//      await marketV2.setPaymentMethod("0x14ec6EE23dD1589ea147deB6c41d5Ae3d6544893",  true);
//
//
//
//}
//
//main()
//  .then(() => process.exit(0))
//  .catch(error => {
//    console.error(error);
//    process.exit(1);
//  });