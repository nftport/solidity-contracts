module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("CustomTokenIdAccessRightsUpdatableBaseURI", {
    from: deployer,
    log: true,
    args: [
      "NFTPort",
      "NFT",
      deployer,
      true,
      "ipfs://baseURI"
    ],
  });
};

module.exports.tags = ["CustomTokenIdAccessRightsUpdatableBaseURI"];
