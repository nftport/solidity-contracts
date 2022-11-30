const { ethers } = require("hardhat");

const deploymentDefaults = {
  name: "ERC1155NFTProduct",
  symbol: "ERC1155Product",
  tokensBurnable: true,
};

const runtimeDefaults = {
  baseURI: "",
  metadataUpdatable: true,
  tokensTransferable: true,
  royaltiesBps: 250,
  royaltiesAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};

module.exports = {
  deploymentDefaults,
  runtimeDefaults,
};
