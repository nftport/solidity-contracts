module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ERC721NFTCustom", {
    from: deployer,
    log: true,
    args: [
      [
        "NFTPort",
        "NFT",
        deployer,
        true,
      ],
      [
        "ipfs://baseURI",
        true,
        true,
        deployer,
        250,
      ],
      []
    ],
  });
};

module.exports.tags = ["ERC721NFTCustom"];
