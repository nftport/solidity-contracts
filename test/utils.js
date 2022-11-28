const { ethers } = require("hardhat");

const factoryLib = require("../js/factory");

module.exports = {
  itSlow,
  xitSlow,
  capitalize,
  random,
  randomChoice,
  signers,
  deploy,
  deployInstance,
};

/**
 * Test helpers
 */

function itSlow(...args) {
  if (process.env.RUN_SLOW_TESTS) {
    it(...args);
  } else {
    xit(...args);
  }
}

function xitSlow(...args) {
  xit(...args);
}

/**
 * Deployment helpers
 */

async function deploy(contractName, ...args) {
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.deploy(...args);
  await contract.deployed();
  return contract;
}

async function deployInstance(name, ...args) {
  const { deployer, user, factorySigner } = await signers();

  await deployments.fixture(["Factory", "Templates"]);
  const template = await ethers.getContract(name);
  const version = await template.VERSION();

  const initTxn = await template.populateTransaction.initialize(...args);
  const deploymentTxn = await factoryLib.deploy(
    deployer,
    {
      template: name,
      version: version,
      initData: initTxn.data,
      metadata: {
        caller: deployer.address,
        expiration: Math.floor(Date.now() / 1000) + 3600,
      },
    },
    factorySigner
  );
  const deploymentReceipt = await deploymentTxn.wait();
  const deploymentEvent = deploymentReceipt.events.find(
    (e) => e.event === "TemplateDeployed"
  );

  const contract = new ethers.Contract(
    deploymentEvent.args.destination,
    template.interface.format(ethers.utils.FormatTypes.full),
    ethers.provider
  );

  // Connect the 'user' account so that the default signer will be unprivileged
  return [contract.connect(user), deploymentTxn];
}

/**
 * General utility functions
 */

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function random(range) {
  if (process.env.DETERMINISTIC_TESTS) {
    return Math.ceil(0.6942 * range);
  } else {
    return Math.ceil(Math.random() * range);
  }
}

function randomChoice(items) {
  return items[random(items.length) - 1];
}

async function signers() {
  const [deployer, factoryOwner, factorySigner, user, owner, external, admin] =
    await ethers.getSigners();

  return {
    deployer,
    user,
    owner,
    external,
    admin,
    factoryOwner,
    factorySigner,
  };
}
