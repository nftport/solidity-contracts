const { ethers } = require("hardhat");

const gasParams = {
  mainnet: {
    maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("3", "gwei"),
  },
  rinkeby: {},
  polygon: {},
  hardhat: {},
  localhost: {},
};

// Export a dummy function so that hardhat-deploy wouldn't fail
module.exports = () => {};
module.exports.gasParams = gasParams;
