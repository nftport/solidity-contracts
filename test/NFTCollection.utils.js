const { ethers } = require("hardhat");

const { random } = require("./utils");

const deploymentDefaults = {
  name: "NFTCollection",
  symbol: "NFT",
  maxSupply: 1000,
  tokensPerMint: 10,
  treasuryAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  reservedSupply: 0,
};

const runtimeDefaults = {
  baseURI: "",
  prerevealTokenURI: "",
  publicMintPrice: ethers.utils.parseEther(`0.${random(5000)}`),
  publicMintPriceFrozen: false,
  presaleMintPrice: ethers.utils.parseEther(`0.${random(3000)}`),
  presaleMintPriceFrozen: false,
  publicMintStart: Math.floor(Date.now() / 1000) + 360000,
  presaleMintStart: Math.floor(Date.now() / 1000) + 360000,
  presaleMerkleRoot: ethers.utils.hexZeroPad("0x00", 32),
  metadataFrozen: false,
  royaltiesBps: 250,
  royaltiesAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};

async function mint(collection, total = 1) {
  let minted = 0;
  const info = await collection.getInfo();

  while (minted < total) {
    const amount = Math.min(
      total - minted,
      random(info.deploymentConfig.tokensPerMint)
    );

    await collection.mint(amount, {
      value: info.runtimeConfig.publicMintPrice.mul(amount),
    });

    minted += amount;
  }

  return minted;
}

module.exports = {
  deploymentDefaults,
  runtimeDefaults,
  mint,
};
