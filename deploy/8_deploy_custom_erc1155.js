module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
  
    await deploy("CustomERC1155", {
      from: deployer,
      log: true,
      args: [
        "NFTPort",
        "NFT",
        deployer,
        true,
        true,
        true,
        "ipfs://baseURI",
        ""
      ],
    });
  };
  
  module.exports.tags = ["CustomERC1155"];
  