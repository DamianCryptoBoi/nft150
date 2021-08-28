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
  defaultNetwork: 'rinkeby',
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
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/fca5c00ba9a04c7c934d026632ed868e',
      accounts: [`9b1a1461a714724dbf4e8d2345cf5008545e1140f54914a0c1a62eb1bf1c88a0`],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    },

    testbnb: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: ['2a7b162564c6ca43e6289d48757bc12261339baa0b7a96271f0e0f99ed52e7a0'],

    }
  },

  etherscan: {
    apiKey: "GUNCG9NJ78N2UW5WZSEUC82CQARFRVSWF5"
  }
};
