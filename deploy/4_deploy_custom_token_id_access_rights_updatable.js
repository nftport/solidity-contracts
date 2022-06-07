module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("CustomTokenIdAccessRightsUpdatable", {
    from: deployer,
    log: true,
    args: [
      "NFTPort",
      "NFT",
      deployer,
      true
    ],
  });
};

module.exports.tags = ["CustomTokenIdAccessRightsUpdatable"];
