module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("NFTCollectionContract", {
    from: deployer,
    log: true,
    args: [
      {
        owner: deployer,
        name: "NFTCollection",
        symbol: "NFT",
        maxSupply: 1000,
        reservedSupply: 0,
        tokensPerMint: 10,
        treasuryAddress: deployer,
      },
      {
        baseURI: "",
        prerevealTokenURI: "",
        publicMintStart: 0,
        publicMintPrice: ethers.utils.parseEther("0.01"),
        presaleMintStart: 0,
        presaleMintPrice: ethers.utils.parseEther("0.01"),
        presaleMerkleRoot: ethers.utils.hexZeroPad("0x00", 32),
        metadataFrozen: false,
        royaltiesBps: 250,
        royaltiesAddress: deployer,
      },
    ],
  });
};

module.exports.tags = ["NFTCollectionContract", "Standalone"];
