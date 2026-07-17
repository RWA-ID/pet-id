require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env.local" });

module.exports = {
  paths: {
    sources: "./src",
  },
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: process.env.FORK
      ? { forking: { url: process.env.RPC_URL ?? "" } }
      : {},
    mainnet: {
      url: process.env.RPC_URL ?? "",
      accounts: process.env.ADMIN_WALLET_PRIVATE_KEY ? [process.env.ADMIN_WALLET_PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.RPC_URL_SEPOLIA ?? "",
      accounts: process.env.ADMIN_WALLET_PRIVATE_KEY ? [process.env.ADMIN_WALLET_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
