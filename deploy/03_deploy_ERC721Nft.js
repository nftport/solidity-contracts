module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ERC721NFT", {
    from: deployer,
    log: true,
    args: ["NFTPort.xyz v2", "NFTP"],
  });
};

module.exports.tags = ["ERC721NFT"];
