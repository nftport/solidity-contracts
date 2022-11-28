const { gasParams } = require("./shared");

module.exports = async ({ deployments }) => {
  const { deploy, execute, catchUnknownSigner } = deployments;
  const { deployer, factoryOwner } = await getNamedAccounts();

  const result = await deploy("ERC721NFTProduct", {
    from: deployer,
    log: true,
  });

  if (result.newlyDeployed) {
    const template = await ethers.getContract("ERC721NFTProduct");

    await catchUnknownSigner(
      execute(
        "Factory",
        { from: factoryOwner, log: true },
        "registerTemplate",
        template.address
      )
    );
  }
};

module.exports.dependencies = ["Factory"];
module.exports.tags = ["ERC721NFTProduct", "EVM", "Templates"];
