module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, catchUnknownSigner } = deployments;
  const { deployer, factoryOwner, factorySigner } = await getNamedAccounts();

  await catchUnknownSigner(
    deploy("Factory", {
      from: deployer,
      proxy: {
        owner: factoryOwner,
        execute: {
          init: {
            methodName: "initialize",
            args: [factoryOwner, factorySigner],
          },
          onUpgrade: {
            methodName: "upgrade",
          },
        },
      },
      log: true,
    })
  );
};

module.exports.tags = ["Factory", "EVM"];
