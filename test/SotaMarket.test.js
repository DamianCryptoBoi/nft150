//const SotaMarket = artifacts.require("SotaMarket");
//const MockUSDT = artifacts.require("MockUSDT");
//const MockSOTA = artifacts.require("MockSOTA");
//const MockWBNB = artifacts.require("MockWBNB");
//const MockSotaExchange = artifacts.require("MockSotaExchange");
//const MockSOTA1155 = artifacts.require("MockSOTA1155");
//const MockERC721 = artifacts.require("MockERC721");
//const SOTAReferral = artifacts.require("SOTAReferral");
//const { assert } = require("chai");
//const { time } = require("openzeppelin-test-helpers");
//const constants = require("openzeppelin-test-helpers/src/constants");
//const { ZERO_ADDRESS } = require("openzeppelin-test-helpers/src/constants");
//const { web3 } = require("openzeppelin-test-helpers/src/setup");
//const big = (n) => web3.utils.toBN(n);
//
//const parseUnits = (units, pow) => big(+units).mul(big(10).pow(big(pow)));
//
//const deployMock = async (accounts) => {
//  const sotaToken = await MockSOTA.new();
//  const usdtToken = await MockUSDT.new();
//  const wBNB = await MockWBNB.new();
//  const sotaExchange = await MockSotaExchange.new();
//  const sotaRef = await SOTAReferral.new();
//  const sota1155 = await MockSOTA1155.new();
//  const farmingNFT = await MockSOTA1155.new();
//  const sotaMarket = await SotaMarket.new();
//  const nft721 = await MockERC721.new();
//  await sotaMarket.setSotaContract(sotaToken.address);
//  await sotaMarket.addSOTANFTs(sota1155.address, true, false);
//  await sotaMarket.addSOTANFTs(farmingNFT.address, true, true);
//  await sotaMarket.setReferralContract(sotaRef.address);
//  await sotaMarket.setSotaExchangeContract(sotaExchange.address);
//  await sotaMarket.setPaymentMethod(sotaToken.address, true);
//  await sotaMarket.setPaymentMethod(usdtToken.address, true);
//  await sotaMarket.setPaymentMethod(wBNB.address, true);
//  return {
//    sotaToken,
//    usdtToken,
//    sotaExchange,
//    sotaRef,
//    sota1155,
//    sotaMarket,
//    wBNB,
//    nft721,
//    farmingNFT,
//  };
//};
//
//contract("SOTAMARKET", (accounts) => {
//  it("should properly initialize the contract", async () => {
//    const {
//      sotaToken,
//      usdtToken,
//      sotaExchange,
//      sotaRef,
//      sota1155,
//      sotaMarket,
//    } = await deployMock(accounts);
//    assert.equal(await sotaMarket.sota(), sotaToken.address);
//    assert.equal(await sotaMarket.sotaExchangeContract(), sotaExchange.address);
//    assert.equal(await sotaMarket.referralContract(), sotaRef.address);
//    assert.equal(await sotaMarket.isSOTANFTs(sota1155.address), true);
//  });
//
//  it("should properly create NFT and put on sale/buy success", async () => {
//    const { sota1155, sotaMarket, usdtToken } = await deployMock(accounts);
//    let seller = accounts[1]; // also creator
//    let buyer = accounts[2];
//    let balanceNFTOFSeller, balanceNFTOfBuyer, balanceNFTOfMarket;
//
//    await sota1155.create(10, 10, 1000, "", "0x", {
//      from: seller,
//    });
//    await sota1155.setApprovalForAll(sotaMarket.address, true, {
//      from: seller,
//    });
//    balanceNFTOFSeller = await sota1155.balanceOf(seller, 1);
//    console.log("Balance of seller: ", balanceNFTOFSeller.toString());
//    let isApprovedForAll = await sota1155.isApprovedForAll(
//      seller,
//      sotaMarket.address
//    );
//    console.log("isApprovedForAll: ", isApprovedForAll);
//    await sotaMarket.createOrder(
//      sota1155.address,
//      ZERO_ADDRESS,
//      usdtToken.address,
//      1,
//      2,
//      web3.utils.toWei("50", "ether"), // 50 USDT
//      0,
//      {
//        from: seller,
//      }
//    );
//    balanceNFTOfMarket = await sota1155.balanceOf(sotaMarket.address, 1);
//    let order = await sotaMarket.orders(0);
//    assert.equal(order.price.toString(), web3.utils.toWei("50", "ether"));
//    assert.equal(order.isOnsale, true);
//    assert.equal(order.isERC721, false);
//    assert.equal(order.quantity.toString(), 2);
//    assert.equal(balanceNFTOfMarket.toString(), 2);
//    await usdtToken.mint(web3.utils.toWei("200", "ether"), {
//      from: buyer,
//    });
//    let balanceOfBuyer = await usdtToken.balanceOf(buyer);
//    let balanceOfSeller = await usdtToken.balanceOf(seller);
//    let balanceOfMarket = await usdtToken.balanceOf(sotaMarket.address);
//    console.log("Buyer balance: ", balanceOfBuyer.toString());
//    console.log("Seller balance: ", balanceOfSeller.toString());
//    console.log("Market balance: ", balanceOfMarket.toString());
//    await usdtToken.approve(sotaMarket.address, constants.MAX_UINT256, {
//      from: buyer,
//    });
//    await sotaMarket.buy(
//      0,
//      2,
//      usdtToken.address,
//      {
//        from: buyer,
//      }
//    );
//    balanceOfBuyer = await usdtToken.balanceOf(buyer);
//    balanceOfSeller = await usdtToken.balanceOf(seller);
//    balanceOfMarket = await usdtToken.balanceOf(sotaMarket.address);
//    assert.equal(balanceOfBuyer.toString(), web3.utils.toWei("97.5", "ether"));
//    assert.equal(balanceOfSeller.toString(), web3.utils.toWei("85", "ether"));
//    assert.equal(balanceOfMarket.toString(), web3.utils.toWei("17.5", "ether"));
//    balanceNFTOfMarket = await sota1155.balanceOf(sotaMarket.address, 1);
//    assert.equal(balanceNFTOfMarket.toString(), 0);
//    balanceNFTOfBuyer = await sota1155.balanceOf(buyer, 1);
//    assert.equal(balanceNFTOfBuyer.toString(), 2);
//
//    // 2nd round
//    let buyer2 = accounts[3];
//    await usdtToken.mint(web3.utils.toWei("1000", "ether"), {
//      from: buyer2,
//    });
//    await usdtToken.approve(sotaMarket.address, constants.MAX_UINT256, {
//      from: buyer2,
//    });
//    await sota1155.setApprovalForAll(sotaMarket.address, true, {
//      from: buyer,
//    });
//    await sotaMarket.createOrder(
//      sota1155.address,
//      ZERO_ADDRESS,
//      usdtToken.address,
//      1,
//      2,
//      web3.utils.toWei("70", "ether"), // 70 USDT
//      0,
//      {
//        from: buyer,
//      }
//    );
//
//    let order1 = await sotaMarket.orders(1);
//    assert.equal(order1.price.toString(), web3.utils.toWei("70", "ether"));
//    assert.equal(order1.isOnsale, true);
//    assert.equal(order1.isERC721, false);
//    assert.equal(order1.quantity.toString(), 2);
//    await sotaMarket.buy(
//      1,
//      2,
//      usdtToken.address,
//      {
//        from: buyer2,
//      }
//    );
//    const balanceOfCreator = await usdtToken.balanceOf(seller);
//    const profitA = await sotaMarket.profitA();
//    const balanceOfBuyer2 = await usdtToken.balanceOf(buyer2);
//    balanceOfMarket = await usdtToken.balanceOf(sotaMarket.address);
//    console.log("profit", profitA.toString());
//    console.log("Balance of Creator: ", balanceOfCreator.toString());
//    assert.equal(
//      balanceOfCreator.toString(),
//      web3.utils.toWei("88.4", "ether")
//    );
//    assert.equal(balanceOfMarket.toString(), web3.utils.toWei("24.5", "ether"));
//    assert.equal(
//      balanceOfBuyer2.toString(),
//      web3.utils.toWei("856.5", "ether")
//    );
//    console.log("Passed profit calculation");
//  });
//
//  it("should properly create NFT ERC721 and put on sale/buy success", async () => {
//    const { nft721, sotaMarket, usdtToken } = await deployMock(accounts);
//
//    let seller = accounts[1]; // also creator
//    let buyer = accounts[2];
//    let balanceNFTOFSeller, balanceNFTOfBuyer, balanceNFTOfMarket;
//
//    await nft721.mint(1, {
//      from: seller,
//    });
//    await nft721.setApprovalForAll(sotaMarket.address, true, {
//      from: seller,
//    });
//    balanceNFTOFSeller = await nft721.balanceOf(seller);
//    console.log("Balance of seller: ", balanceNFTOFSeller.toString());
//    let isApprovedForAll = await nft721.isApprovedForAll(
//      seller,
//      sotaMarket.address
//    );
//    console.log("isApprovedForAll: ", isApprovedForAll);
//    await sotaMarket.createOrder(
//      nft721.address,
//      ZERO_ADDRESS,
//      usdtToken.address,
//      1,
//      1,
//      web3.utils.toWei("50", "ether"), // 50 USDT
//      0,
//      {
//        from: seller,
//      }
//    );
//    balanceNFTOfMarket = await nft721.balanceOf(sotaMarket.address);
//    assert.equal(balanceNFTOfMarket.toString(), 1);
//  });
//
//  it("should properly create FARMING NFT and put on sale/buy success", async () => {
//    const { farmingNFT, sotaMarket, usdtToken } = await deployMock(accounts);
//
//    let creator = accounts[1]; // also creator
//    let seller = accounts[2];
//    let seller2 = accounts[3];
//    let buyer = accounts[4];
//    // maxx 10 init 10 fee 10%
//    await farmingNFT.create(10, 10, 1000, "", "0x", {
//      from: creator,
//    });
//
//    await farmingNFT.safeTransferFrom(creator, seller, 1, 1, "0x", {
//      from: creator,
//    });
//
//    await farmingNFT.safeTransferFrom(creator, seller2, 1, 1, "0x", {
//      from: creator,
//    });
//
//    await farmingNFT.setApprovalForAll(sotaMarket.address, true, {
//      from: seller,
//    });
//    await farmingNFT.setApprovalForAll(sotaMarket.address, true, {
//      from: seller2,
//    });
//    await sotaMarket.createOrder(
//      farmingNFT.address,
//      ZERO_ADDRESS,
//      usdtToken.address,
//      1,
//      1,
//      web3.utils.toWei("50", "ether"), // 50 USDT
//      0,
//      {
//        from: seller,
//      }
//    );
//
//    await sotaMarket.createOrder(
//      farmingNFT.address,
//      ZERO_ADDRESS,
//      usdtToken.address,
//      1,
//      1,
//      web3.utils.toWei("100", "ether"), // 50 USDT
//      0,
//      {
//        from: seller2,
//      }
//    );
//    balanceNFTOfMarket = await farmingNFT.balanceOf(sotaMarket.address, 1);
//    assert.equal(balanceNFTOfMarket.toString(), 2);
//    await usdtToken.mint(web3.utils.toWei("200", "ether"), {
//      from: buyer,
//    });
//    await usdtToken.approve(sotaMarket.address, constants.MAX_UINT256, {
//      from: buyer,
//    });
//
//    await sotaMarket.buy(
//      0,
//      1,
//      usdtToken.address,
//      {
//        from: buyer,
//      }
//    );
//    await sotaMarket.buy(1, 1, usdtToken.address, {
//      from: buyer,
//    });
//    const balanceOfCreator = await usdtToken.balanceOf(creator);
//    const balanceOfSeller = await usdtToken.balanceOf(seller);
//    const balanceOfSeller2 = await usdtToken.balanceOf(seller2);
//    const balanceOfMarket = await usdtToken.balanceOf(sotaMarket.address);
//    console.log("Balance of creator: ", balanceOfCreator.toString());
//    console.log("Balance of seller: ", balanceOfSeller.toString());
//    console.log("Balance of seller2: ", balanceOfSeller2.toString());
//    console.log("Balance of market: ", balanceOfMarket.toString());
//    assert.equal(balanceOfCreator.toString(), web3.utils.toWei("75", "ether"));
//    assert.equal(balanceOfSeller.toString(), web3.utils.toWei("25", "ether"));
//    assert.equal(balanceOfSeller2.toString(), web3.utils.toWei("50", "ether"));
//    assert.equal(balanceOfMarket.toString(), web3.utils.toWei("3.75", "ether"));
//
//    //
//  });
//});
