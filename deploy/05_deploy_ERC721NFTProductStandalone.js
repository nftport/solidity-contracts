module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ERC721NFTProductStandalone", {
    from: deployer,
    log: true,
    args: [
      {
        name: "ERC721NFTProduct",
        symbol: "NFT",
        owner: deployer,
        tokensBurnable: true,
      },
      {
        baseURI: "",
        metadataUpdatable: true,
        tokensTransferable: true,
        royaltiesBps: 250,
        royaltiesAddress: deployer,
      },
      [],
    ],
  });
};

module.exports.tags = ["ERC721NFTProductStandalone"];
