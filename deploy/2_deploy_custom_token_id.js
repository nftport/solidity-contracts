module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("CustomTokenId", {
    from: deployer,
    log: true,
    args: [
      "NFTPort",
      "NFT"
    ],
  });
};

module.exports.tags = ["CustomTokenId"];
