/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-abi-exporter");
require("dotenv").config();
require('hardhat-contract-sizer');

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.2"
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
  },
  // solidity: {
  //   version: "0.8.6",
  //   settings: {
  //     optimizer: {
  //       enabled: true,
  //       runs: 200
  //     }
  //   }
  // },
  defaultNetwork: 'rinkeby',
  networks: {
    hardhat: {
        gas: 12000000,
        blockGasLimit: 0x1fffffffffffff,
        allowUnlimitedContractSize: true,
        timeout: 1800000
    },
    rinkeby: {
      url: process.env.PROVIDER_URL,
      accounts: [process.env.PRIVATE_KEY],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    },
    mainnet: {
      url: process.env.PROVIDER_URL,
      accounts: [process.env.PRIVATE_KEY],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY
  },

  // contractSizer: {
  //   alphaSort: true,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: true,
  // }
};
