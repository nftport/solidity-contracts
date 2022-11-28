require("hardhat-deploy");
require("solidity-docgen");
require("hardhat-watcher");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.15",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    // Always the first account
    deployer: 0,
    factoryOwner: {
      // Defaults to second account
      default: 1,
      mainnet: "0xb3613DA07178a0beE44b48FBBCe1fa70Ff5d2DCC", // https://gnosis-safe.io/app/eth:0xb3613DA07178a0beE44b48FBBCe1fa70Ff5d2DCC
      rinkeby: "0x0e119b7CCD4603F209aF071DBD9eDe69D66Ced31", // https://gnosis-safe.io/app/rin:0x0e119b7CCD4603F209aF071DBD9eDe69D66Ced31
      goerli: "0x534b107C4958e2AEddf47C438bd4388e2Bd5402A", // https://gnosis-safe.io/app/gor:0x534b107C4958e2AEddf47C438bd4388e2Bd5402A
      // polygon: '',
    },
    factorySigner: {
      // Defaults to third account
      default: 2,
      mainnet: "0xFe9609570EE974bFBf29691Db9c6f6d2512D623A",
      rinkeby: "0xa5E346307bd4C7067C9C2cBfd1992B0C5603683C",
      goerli: "0xf2e5fEb12556400E0702edeeA26938E90D7a5Ea2",
      // polygon: '',
    },
  },
  networks: {
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID || "31337"),
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_PROJECT_ID}`,
      accounts: process.env.DEPLOYER_WALLET
        ? [process.env.DEPLOYER_WALLET]
        : undefined,
      etherscan: { apiKey: process.env.API_KEY_ETHERSCAN },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_PROJECT_ID}`,
      accounts: process.env.DEPLOYER_WALLET
        ? [process.env.DEPLOYER_WALLET]
        : undefined,
      etherscan: { apiKey: process.env.API_KEY_ETHERSCAN },
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: process.env.DEPLOYER_WALLET
        ? [process.env.DEPLOYER_WALLET]
        : undefined,
      etherscan: { apiKey: process.env.API_KEY_POLYGONSCAN },
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_PROJECT_ID}`,
      accounts: process.env.DEPLOYER_WALLET
        ? [process.env.DEPLOYER_WALLET]
        : undefined,
      etherscan: { apiKey: process.env.API_KEY_ETHERSCAN },
    },
  },
  watcher: {
    dev: {
      tasks: ["test"],
      files: ["./contracts", "./test"],
    },
    docs: {
      tasks: ["docgen"],
      files: ["./contracts"],
    },
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "USD",
    gasPrice: 55,
    coinmarketcap: process.env.CMC_API_KEY,
  },
  contractSizer: {
    runOnCompile: !!process.env.REPORT_CONTRACT_SIZE,
  },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: !!process.env.GENERATE_DOCS,
    pages: "files",
  },
};
