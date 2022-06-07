module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("CustomTokenIdAccessRights", {
    from: deployer,
    log: true,
    args: [
      "NFTPort",
      "NFT",
      deployer
    ],
  });
};

module.exports.tags = ["CustomTokenIdAccessRights"];
