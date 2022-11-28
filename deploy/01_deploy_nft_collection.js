module.exports = async ({ deployments }) => {
  const { deploy, execute, catchUnknownSigner } = deployments;
  const { deployer, factoryOwner } = await getNamedAccounts();

  const result = await deploy("NFTCollection", {
    from: deployer,
    log: true,
  });

  if (result.newlyDeployed) {
    const template = await ethers.getContract("NFTCollection");

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
module.exports.tags = ["NFTCollection", "EVM", "Templates"];
