require("dotenv").config();
const POLYGON_PRIVATE_KEY_MUMBAI = process.env.POLYGON_PRIVATE_KEY_MUMBAI;
const POLYGON_PRIVATE_KEY_MAINNET = process.env.POLYGON_PRIVATE_KEY_MAINNET;

const ETHEREUM_PRIVATE_KEY_RINKEBY = process.env.ETHEREUM_PRIVATE_KEY_RINKEBY;
const RINKEBY_GATEWAY_URL = process.env.RINKEBY_GATEWAY_URL;

const ETHEREUM_PRIVATE_KEY_MAINNET = process.env.ETHEREUM_PRIVATE_KEY_MAINNET;

require("hardhat-abi-exporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    polygon: {
      url: "https://rpc-mainnet.maticvigil.com/",
      accounts: [POLYGON_PRIVATE_KEY_MAINNET],
      etherscan: { apiKey: process.env.API_KEY_POLYGONSCAN },
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [POLYGON_PRIVATE_KEY_MUMBAI],
      etherscan: { apiKey: process.env.API_KEY_POLYGONSCAN },
    },
    rinkeby: {
      url: RINKEBY_GATEWAY_URL,
      accounts: [ETHEREUM_PRIVATE_KEY_RINKEBY],
      etherscan: { apiKey: process.env.API_KEY_ETHERSCAN },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
};
