const SotaMarketV2 = artifacts.require("SotaMarketV2.sol");
const Sota721General = artifacts.require("Sota721General");
const SOTAReferral = artifacts.require("SOTAReferral");
const SOTAExchange = artifacts.require("SOTAExchange");
const ProfitEstimator = artifacts.require("ProfitEstimator");
module.exports = async function (deployer) {
  // await deployer.deploy(Sota721General);
  // let sota721 = await Sota721General.deployed();
  // await deployer.deploy(
  //   SotaMarketV2,
  //   "0x46b9d3509fdbdd8726e296ab2fa5044c443c26b0"
  // );

  // await deployer.deploy(SOTAReferral);
  let sotaMarket = await SotaMarketV2.at(
    "0x7f61befffa9a8e584dd8d6d07b2d1e5ed16dd100"
  );
  // let sotaRef = await SOTAReferral.at(
  //   "0x12e4d0913De514F1afCD394bFD4bE209dE5F0246"
  // );
  // await sotaRef.setOperator("0xfDbF559074abE8475Af19aF71FFA9A0C635e2f19", true);
  // await deployer.deploy(
  //   ProfitEstimator,
  //   sotaMarket.address,
  //   "0x6A32664C4f8E4bceF16cffb2CC11467AA5936Ed8"
  // );
  await sotaMarket.whiteListOperator(
    "0xfDbF559074abE8475Af19aF71FFA9A0C635e2f19",
    true
  );
  await sotaMarket.addSOTANFTs(
    "0xCD344D16070c820030D5FB47ff58852ecAC1D6F4",
    true,
    true
  );
  await sotaMarket.addSOTANFTs(
    "0xAF11c385ecee6cF72ae37658d4367eFB25a4B2Da",
    true,
    false
  );
  await sotaMarket.addSOTANFTs(
    "0xa0e7fe8176135C12657f54F41DF5851F22C868B3",
    true,
    false
  );
  await sotaMarket.setReferralContract(
    "0x12e4d0913De514F1afCD394bFD4bE209dE5F0246"
  );

  await sotaMarket.setPaymentMethod(
    "0x55d398326f99059ff775485246999027b3197955", // usdt
    true
  );
  await sotaMarket.setPaymentMethod(
    "0x0742b62efb5f2eabbc14567dfc0860ce0565bcf4", // sota
    true
  );
  await sotaMarket.setPaymentMethod(
    "0x0000000000000000000000000000000000000000", // bnb
    true
  );
  await sotaMarket.setSotaContract(
    "0x0742b62efb5f2eabbc14567dfc0860ce0565bcf4"
  );
  // let profitSender = await ProfitEstimator.deployed();
  await sotaMarket.setProfitSenderContract(
    "0xD3Ae3212F5C9d9354D47abaf41A220B65c7639a0"
  );
  await sotaMarket.setSotaExchangeContract(
    "0x6A32664C4f8E4bceF16cffb2CC11467AA5936Ed8"
  );
  // console.log("SOTA MARKET: ", sotaMarket.address);
  // // console.log("SOTA REF: ", sotaRef.address);
  // console.log("SOTA exchange: ", "0x6A32664C4f8E4bceF16cffb2CC11467AA5936Ed8");
};
