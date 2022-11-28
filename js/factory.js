const { ethers } = require("hardhat");

async function signDeploymentRequest(factory, signer, request) {
  const domain = {
    name: "Factory",
    version: "1",
    chainId: await signer.getChainId(),
    verifyingContract: factory.address,
  };

  const types = {
    DeploymentRequest: [
      { type: "string", name: "template" },
      { type: "uint256", name: "version" },
      { type: "bytes", name: "initData" },
      { type: "RequestMetadata", name: "metadata" },
    ],
    RequestMetadata: [
      { type: "address", name: "caller" },
      { type: "uint256", name: "expiration" },
    ],
  };

  return signer._signTypedData(domain, types, request);
}

async function signCallRequest(factory, signer, request) {
  const domain = {
    name: "Factory",
    version: "1",
    chainId: await signer.getChainId(),
    verifyingContract: factory.address,
  };

  const types = {
    CallRequest: [
      { type: "address", name: "instance" },
      { type: "bytes", name: "callData" },
      { type: "RequestMetadata", name: "metadata" },
    ],
    RequestMetadata: [
      { type: "address", name: "caller" },
      { type: "uint256", name: "expiration" },
    ],
  };

  return signer._signTypedData(domain, types, request);
}

async function deploy(deployer, request, signer) {
  const factory = await ethers.getContract("Factory");
  const signature = await signDeploymentRequest(factory, signer, request);
  return factory.connect(deployer).deploy(request, signature);
}

async function call(deployer, request, signer) {
  const factory = await ethers.getContract("Factory");
  const signature = await signCallRequest(factory, signer, request);
  return factory.connect(deployer).call(request, signature);
}

module.exports = {
  deploy,
  call,
};
