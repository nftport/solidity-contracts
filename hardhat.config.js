require("dotenv").config();
const POLYGON_PRIVATE_KEY_MUMBAI = process.env.POLYGON_PRIVATE_KEY_MUMBAI;
const POLYGON_PRIVATE_KEY_MAINNET = process.env.POLYGON_PRIVATE_KEY_MAINNET;

const ETHEREUM_PRIVATE_KEY_RINKEBY = process.env.ETHEREUM_PRIVATE_KEY_RINKEBY;
const ETHEREUM_PRIVATE_KEY_MAINNET = process.env.ETHEREUM_PRIVATE_KEY_MAINNET;

require('hardhat-abi-exporter');
require("solidity-coverage");
require("@nomiclabs/hardhat-waffle");

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
  defaultNetwork: "matic",
  networks: {
    hardhat: {
    },
    matic: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [POLYGON_PRIVATE_KEY_MUMBAI]
    },
    maticMainnet: {
      url: "https://rpc-mainnet.maticvigil.com/",
      accounts: [POLYGON_PRIVATE_KEY_MAINNET]
    },
    ethereumRinkeby: {
      url: "https://eth-rinkeby.alchemyapi.io/v2/GdJgwquJRioF66LS4Km5fGmBxRbTHWp2",
      accounts: [ETHEREUM_PRIVATE_KEY_RINKEBY]
    }
  },
  solidity: {
    version: "0.8.2",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
  abiExporter: {
    path: './data/abi',
    clear: true,
    flat: true,
    spacing: 2
  }
}

