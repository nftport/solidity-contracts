module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("ERC1155NFT", {
    from: deployer,
    log: true,
    args: ["", "NFTPort.xyz v2", "NFTP"],
  });
};

module.exports.tags = ["ERC1155NFT"];
