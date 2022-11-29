module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ERC721NFTProductContract", {
    from: deployer,
    log: true,
    args: [
      {
        name: "NFTPort",
        symbol: "NFT",
        owner: deployer,
        tokensBurnable: true,
      },
      {
        baseURI: "ipfs://baseURI",
        metadataUpdatable: true,
        tokensTransferable: true,
        royaltiesBps: 250,
        royaltiesAddress: deployer,
      },
      [],
    ],
  });
};

module.exports.tags = ["ERC721NFTProductContract", "Standalone"];
