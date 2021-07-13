require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");
let bscProvider = new HDWalletProvider(
  process.env.PRIVATE_KEY_ADMIN,
  process.env.BSC_ENDPOINT
);

module.exports = {
  networks: {
    bsc: {
      provider: bscProvider,
      network_id: 56,
      gas: 5000000,
      gasPrice: 5000000000,
      skipDryRun: true,
      networkCheckTimeout: 10000000,
    },
  },
  plugins: ["truffle-plugin-verify", "truffle-contract-size"],
  api_keys: {
    bscscan: ""
  },
  compilers: {
    solc: {
      version: "0.6.8",
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
