const factoryLib = require("../js/factory");

const { signers, deployInstance } = require("./utils");
const {
  deploymentDefaults,
  runtimeDefaults,
} = require("./ERC721NFTProduct.utils");

const FUNCTION_CALL_REPETITIONS = 100;
const TOKEN_URI_MAX_LENGTH = 100;
const PREMINTED_TOKENS = 100;

function generateRandomTokenURI() {
  let tokenURI = "";
  for (let j = 0; j < TOKEN_URI_MAX_LENGTH; j++) {
    tokenURI = `${tokenURI}${Math.floor(Math.random() * 10)}`;
  }
  return tokenURI;
}

const gasStats = {};

function recordMeasurement(label, measurement) {
  const stats = gasStats[label];

  if (!stats) {
    gasStats[label] = {
      min: measurement,
      max: measurement,
      mean: measurement,
      count: 1,
    };
  } else {
    gasStats[label] = {
      min: Math.min(stats.min, measurement),
      max: Math.max(stats.max, measurement),
      mean: Math.round(
        (stats.mean * stats.count + measurement) / (stats.count + 1)
      ),
      count: stats.count + 1,
    };
  }
}

async function measureGas(txn) {
  const receipt = await txn.wait();
  return receipt.gasUsed.toNumber();
}

async function factoryMeasure(contract, method, args) {
  const { deployer, factorySigner } = await signers();
  const call = await contract.populateTransaction[method](...args);
  const txn = await factoryLib.call(
    deployer,
    {
      instance: contract.address,
      callData: call.data,
      metadata: {
        caller: deployer.address,
        expiration: Math.floor(Date.now() / 1000) + 3600,
      },
    },
    factorySigner
  );

  const gas = await measureGas(txn);
  recordMeasurement(method, gas);
}

describe("ERC721NFTProduct", () => {
  let contract;
  let namedSigners;

  before(async () => {
    namedSigners = await signers();
  });

  beforeEach(async () => {
    [contract, txn] = await deployInstance(
      "ERC721NFTProduct",
      { ...deploymentDefaults, owner: namedSigners.owner.address },
      runtimeDefaults,
      []
    );

    recordMeasurement("deployment", await measureGas(txn));

    for (let i = 0; i < PREMINTED_TOKENS; i++) {
      await factoryMeasure(contract, "mintToCaller", [
        namedSigners.owner.address,
        i,
        generateRandomTokenURI(),
      ]);
    }
  });

  after(() => {
    console.table(gasStats);
  });

  it("Gas estimate for mints", async () => {
    for (
      let i = PREMINTED_TOKENS;
      i < PREMINTED_TOKENS + FUNCTION_CALL_REPETITIONS;
      i++
    ) {
      await factoryMeasure(contract, "mintToCaller", [
        namedSigners.deployer.address,
        i,
        generateRandomTokenURI(),
      ]);
    }
  });

  it("Gas estimate for token updates", async () => {
    for (let i = 0; i < PREMINTED_TOKENS; i++) {
      await factoryMeasure(contract, "updateTokenUri", [
        i,
        generateRandomTokenURI(),
        false,
      ]);
    }
  });

  it("Gas estimate for transfers", async () => {
    for (let i = 0; i < PREMINTED_TOKENS; i++) {
      await factoryMeasure(contract, "transferByOwner", [
        namedSigners.deployer.address,
        i,
      ]);
    }
  });

  it("Gas estimate for burns", async () => {
    for (let i = 0; i < PREMINTED_TOKENS; i++) {
      await factoryMeasure(contract, "burn", [i]);
    }
  });

  it("Gas estimate for contract updates", async () => {
    for (let i = 0; i < FUNCTION_CALL_REPETITIONS; i++) {
      await factoryMeasure(contract, "update", [
        { ...runtimeDefaults, baseURI: generateRandomTokenURI() },
        [],
        false,
      ]);
    }
  });
});
