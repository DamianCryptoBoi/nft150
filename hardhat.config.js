/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-abi-exporter");
require("dotenv").config();

module.exports = {


  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
        gas: 12000000,
        blockGasLimit: 0x1fffffffffffff,
        allowUnlimitedContractSize: true,
        timeout: 1800000
    },
    testnet: {
      //url: "https://data-seed-prebsc-2-s1.binance.org:8545",
      //accounts: [process.env.PRIVATE_KEY],
      url: 'https://ropsten.infura.io/v3/fca5c00ba9a04c7c934d026632ed868e',
      accounts: [`0xc5f4ffe418d0ce5a33fdb6444d66484feed262d099f83dd404f9b8f8ac36c016`],
    },
    ropsten: {
      //url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      url: 'https://ropsten.infura.io/v3/fca5c00ba9a04c7c934d026632ed868e',
      accounts: [`0xc5f4ffe418d0ce5a33fdb6444d66484feed262d099f83dd404f9b8f8ac36c016`]
    },

    testbnb: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: ['2a7b162564c6ca43e6289d48757bc12261339baa0b7a96271f0e0f99ed52e7a0'],
    }
  },

  etherscan: {
    apiKey: process.env.BSC_API_KEY
  }
};
