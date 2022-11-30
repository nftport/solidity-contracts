const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

const {
  xitSlow,
  itSlow,
  random,
  signers,
  deploy,
  deployInstance,
} = require("./utils");

const {
  mint,
  deploymentDefaults,
  runtimeDefaults,
} = require("./NFTCollection.utils");

describe("NFTCollection", () => {
  let collection;
  let deploymentConfig;
  let runtimeConfig;

  async function updateConfig(newConfig) {
    const { owner } = await signers();
    const info = await collection.getInfo();
    return collection
      .connect(owner)
      .updateConfig({ ...info.runtimeConfig, ...newConfig });
  }

  function describeVariable(variableName, testContents = () => {}) {
    const itwrapper = (...args) => it(...args);

    itwrapper.isDeploymentConfiguration = () => {
      it("Should be a deployment variable", async () => {
        const info = await collection.getInfo();
        expect(typeof info.deploymentConfig[variableName]).not.to.equal(
          "undefined"
        );
      });
    };

    itwrapper.isRuntimeConfiguration = () => {
      it("Should be a runtime variable", async () => {
        const info = await collection.getInfo();
        expect(typeof info.runtimeConfig[variableName]).not.to.equal(
          "undefined"
        );
      });
    };

    itwrapper.isInitializedTo = (defaultValue) => {
      it("Should be initialized", async () => {
        const info = await collection.getInfo();
        const fullConfiguration = {
          ...info.deploymentConfig,
          ...info.runtimeConfig,
        };
        expect(fullConfiguration[variableName]).to.equal(defaultValue);
      });
    };

    itwrapper.isUpdatableTo = (updateValue) => {
      it("Should change when updated", async () => {
        await updateConfig({ [variableName]: updateValue });
        const info = await collection.getInfo();
        expect(info.runtimeConfig[variableName]).to.equal(updateValue);
      });
    };

    itwrapper.isFreezable = (
      updateValue,
      flagName = `${variableName}Frozen`
    ) => {
      it(`Should not be updatable if ${flagName} is set`, async () => {
        await updateConfig({ [flagName]: true });

        await expect(
          updateConfig({ [variableName]: updateValue })
        ).to.be.revertedWith("Cannot change frozen variable");
      });
    };

    itwrapper.isFreezingFlag = () => {
      it("Should not be reversible", async () => {
        await updateConfig({ [variableName]: true });

        await expect(
          updateConfig({ [variableName]: false })
        ).to.be.revertedWith("Cannot unfreeze variable");
      });
    };

    describe(`Variable: ${variableName}`, () => {
      testContents(itwrapper);
    });
  }

  beforeEach(async () => {
    const { owner, deployer } = await signers();

    deploymentConfig = { ...deploymentDefaults, owner: owner.address };
    runtimeConfig = { ...runtimeDefaults };

    [collection] = await deployInstance(
      "NFTCollection",
      deploymentConfig,
      runtimeConfig
    );

    await collection
      .connect(owner)
      .grantRole(await collection.ADMIN_ROLE(), deployer.address);
  });

  describe("Template deployment", () => {
    it("Should be deployable", async () => {
      await expect(deploy("NFTCollection")).not.to.be.reverted;
    });

    it("Should not be initializable once deployed", async () => {
      const { deployer } = await signers();
      const template = await deploy("NFTCollection");

      await expect(
        template.initialize(
          {
            ...deploymentConfig,
            owner: deployer.address,
          },
          runtimeConfig
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Deployment", () => {
    it("Should succeed with a valid configuration", async function () {
      await expect(
        deployInstance("NFTCollection", deploymentConfig, runtimeConfig)
      ).not.to.be.reverted;
    });

    it("Should fail when any of the configuration options is missing", async function () {
      for (const key in deploymentConfig) {
        const invalidConfig = { ...deploymentConfig };
        delete invalidConfig[key];

        await expect(() =>
          deployInstance("NFTCollection", invalidConfig, runtimeConfig)
        ).to.throw;
      }

      for (const key in runtimeConfig) {
        const invalidConfig = { ...runtimeConfig };
        delete invalidConfig[key];

        await expect(() =>
          deployInstance("NFTCollection", deploymentConfig, invalidConfig)
        ).to.throw;
      }
    });

    it("Should fail when maximum supply is non-zero", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          { ...deploymentConfig, maxSupply: 0 },
          runtimeConfig
        )
      ).to.be.revertedWith("Maximum supply must be non-zero");
      await expect(
        deployInstance(
          "NFTCollection",
          { ...deploymentConfig, maxSupply: -1 },
          runtimeConfig
        )
      ).to.be.reverted;
    });

    it("Should fail when reserved supply exceeds maximum supply", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          {
            ...deploymentConfig,
            maxSupply: 100,
            reservedSupply: 100 + random(10),
          },
          runtimeConfig
        )
      ).to.be.revertedWith("Reserve greater than supply");
    });

    it("Should fail when tokens per mint is zero", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          { ...deploymentConfig, tokensPerMint: 0 },
          runtimeConfig
        )
      ).to.be.revertedWith("Tokens per mint must be non-zero");
      await expect(
        deployInstance(
          "NFTCollection",
          { ...deploymentConfig, tokensPerMint: -1 },
          runtimeConfig
        )
      ).to.be.reverted;
    });

    it("Should fail when tokens per mint exceeds max supply", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          {
            ...deploymentConfig,
            tokensPerMint: deploymentConfig.maxSupply + 1,
          },
          runtimeConfig
        )
      ).to.be.revertedWith("Tokens per mint must be less than max supply");
    });

    it("Should fail when treasury address is set to the burn address", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          {
            ...deploymentConfig,
            treasuryAddress: "0x0000000000000000000000000000000000000000",
          },
          runtimeConfig
        )
      ).to.be.revertedWith("Treasury address cannot be null");
    });

    it("Should fail when the owner is set to the burn address", async () => {
      await expect(
        deployInstance(
          "NFTCollection",
          {
            ...deploymentConfig,
            owner: "0x0000000000000000000000000000000000000000",
          },
          runtimeConfig
        )
      ).to.be.revertedWith("Contract must have an owner");
    });

    it("Should fail when royalties are set to over 100%", async () => {
      await expect(
        deployInstance("NFTCollection", deploymentConfig, {
          ...runtimeConfig,
          royaltiesBps: 10001,
        })
      ).to.be.revertedWith("Royalties too high");
    });

    it("Should emit an OwnershipTransferred event", async () => {
      const { owner } = await signers();
      const [contract, deploymentTxn] = await deployInstance(
        "NFTCollection",
        deploymentConfig,
        runtimeConfig
      );

      await expect(deploymentTxn)
        .to.emit(contract, "OwnershipTransferred")
        .withArgs("0x0000000000000000000000000000000000000000", owner.address);
    });

    it("Should assign admin role to the owner", async () => {
      const { owner } = await signers();
      expect(
        await collection.hasRole(await collection.ADMIN_ROLE(), owner.address)
      ).to.be.true;
    });

    it("Should assign default admin role to the owner", async () => {
      const { owner } = await signers();
      expect(
        await collection.hasRole(
          await collection.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
    });

    it("Should prevent initialize() from being called again", async () => {
      const { owner } = await signers();
      await expect(
        collection.initialize(
          { owner: owner.address, ...deploymentConfig },
          runtimeConfig
        )
      ).to.be.reverted;
    });
  });

  describe("Contract ownership", () => {
    it("Should be transferable by the current owner", async () => {
      const { owner, external } = await signers();
      await expect(
        collection.connect(owner).transferOwnership(external.address)
      ).not.to.be.reverted;
    });

    it("Should not be transferable by users", async () => {
      const { user } = await signers();
      await expect(collection.connect(user).transferOwnership(user.address)).to
        .be.reverted;
    });

    it("Should not be transferable by admins", async () => {
      const { deployer, external } = await signers();
      await expect(
        collection.connect(deployer).transferOwnership(external.address)
      ).to.be.reverted;
    });

    it("Should update owner address on transfer", async () => {
      const { owner, external } = await signers();

      expect(await collection.owner()).to.equal(owner.address);
      await collection.connect(owner).transferOwnership(external.address);
      expect(await collection.owner()).to.equal(external.address);
    });

    it("Should revoke default admin role from the previous owner", async () => {
      const { owner, external } = await signers();
      await collection.connect(owner).transferOwnership(external.address);

      expect(
        await collection.hasRole(
          await collection.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.false;
    });

    it("Should grant default admin role to the new owner", async () => {
      const { owner, external } = await signers();
      await collection.connect(owner).transferOwnership(external.address);

      expect(
        await collection.hasRole(
          await collection.DEFAULT_ADMIN_ROLE(),
          external.address
        )
      ).to.be.true;
    });

    it("Should revoke regular admin role from the previous owner", async () => {
      const { owner, external } = await signers();
      await collection.connect(owner).transferOwnership(external.address);

      expect(
        await collection.hasRole(await collection.ADMIN_ROLE(), owner.address)
      ).to.be.false;
    });

    it("Should grant regular admin role to the new owner", async () => {
      const { owner, external } = await signers();
      await collection.connect(owner).transferOwnership(external.address);

      expect(
        await collection.hasRole(
          await collection.ADMIN_ROLE(),
          external.address
        )
      ).to.be.true;
    });

    it("Should not be transferable to the current owner", async () => {
      const { owner } = await signers();
      await expect(collection.connect(owner).transferOwnership(owner.address))
        .to.be.reverted;
    });

    it("Should emit an OwnershipTransferred event when ownership is transferred", async () => {
      const { owner, external } = await signers();
      await expect(
        collection.connect(owner).transferOwnership(external.address)
      )
        .to.emit(collection, "OwnershipTransferred")
        .withArgs(owner.address, external.address);
    });
  });

  describe("Admin rights", () => {
    it("Should be transferable by admins", async () => {
      const { deployer, external } = await signers();
      await expect(
        collection.connect(deployer).transferAdminRights(external.address)
      ).not.to.be.reverted;
    });

    it("Should not be transferable by users", async () => {
      const { user } = await signers();
      await expect(
        collection.connect(user).transferAdminRights(user.address)
      ).to.be.revertedWith("AccessControl: account 0x");
    });

    it("Should not be transferable by the contract owner", async () => {
      const { owner, external } = await signers();
      await expect(
        collection.connect(owner).transferAdminRights(external.address)
      ).to.be.revertedWith("Use transferOwnership");
    });

    it("Should revoke regular admin role from the caller", async () => {
      const { deployer, external } = await signers();
      await collection.connect(deployer).transferAdminRights(external.address);

      expect(
        await collection.hasRole(
          await collection.ADMIN_ROLE(),
          deployer.address
        )
      ).to.be.false;
    });

    it("Should grant regular admin role to the target", async () => {
      const { deployer, external } = await signers();
      await collection.connect(deployer).transferAdminRights(external.address);

      expect(
        await collection.hasRole(
          await collection.ADMIN_ROLE(),
          external.address
        )
      ).to.be.true;
    });

    it("Should not be transferable to a current admin", async () => {
      const { deployer, owner } = await signers();
      await expect(
        collection.connect(deployer).transferAdminRights(owner.address)
      ).to.be.revertedWith("Already an admin");
    });
  });

  describe("Contract version", () => {
    it("Should be readable", async () => {
      await expect(collection.VERSION()).not.to.be.reverted;
    });

    it("Should be set to 1_05_00", async () => {
      expect(await collection.VERSION()).to.equal(1_05_00);
    });
  });

  describe("Contract information", () => {
    it("Should be readable", async () => {
      await expect(collection.getInfo()).not.to.be.reverted;
    });

    it("Should include contract version", async () => {
      const info = await collection.getInfo();
      expect(info.version).to.equal(await collection.VERSION());
    });

    it("Should include contract deployment configuration", async () => {
      const info = await collection.getInfo();

      for (const key in deploymentConfig) {
        expect(info.deploymentConfig[key]).to.equal(deploymentConfig[key]);
      }
    });

    it("Should include contract runtime configuration", async () => {
      const info = await collection.getInfo();

      for (const key in runtimeConfig) {
        expect(info.runtimeConfig[key]).to.equal(runtimeConfig[key]);
      }
    });
  });

  describe("ERC2981 royalties", () => {
    it("Should be publicly callable", async () => {
      const tokenId = random(deploymentConfig.maxSupply);
      await expect(
        collection.royaltyInfo(tokenId, ethers.utils.parseEther("1.0"))
      ).not.to.be.reverted;
    });

    it("Should return the royalties address as the receiver", async () => {
      const { owner } = await signers();
      const allSigners = await ethers.getSigners();
      const royaltiesSigner = allSigners[random(allSigners.length) - 1];
      await collection.connect(owner).updateConfig({
        ...runtimeConfig,
        royaltiesAddress: royaltiesSigner.address,
      });

      const tokenId = random(deploymentConfig.maxSupply);
      const royalties = await collection.royaltyInfo(
        tokenId,
        ethers.utils.parseEther("1.0")
      );

      expect(royalties.receiver).to.equal(royaltiesSigner.address);
    });

    it("Should return the correct royalties amount", async () => {
      const { owner } = await signers();
      const royaltiesPercentage = random(50);
      await collection.connect(owner).updateConfig({
        ...runtimeConfig,
        royaltiesBps: royaltiesPercentage * 100,
      });
      const salePrice = ethers.utils.parseEther(`${random(100) / 10}`);

      const tokenId = random(deploymentConfig.maxSupply);
      const royalties = await collection.royaltyInfo(tokenId, salePrice);

      expect(royalties.royaltyAmount).to.equal(
        salePrice.mul(royaltiesPercentage).div(100)
      );
    });
  });

  describe("Contract metadata", () => {
    it("Should be public", async () => {
      await expect(collection.contractURI()).not.to.be.reverted;
    });

    it("Should return a base64-encoded JSON object", async () => {
      const contractURI = await collection.contractURI();
      const encodedData = Buffer.from(
        contractURI.replace("data:application/json;base64,", ""),
        "base64"
      );
      const metadata = JSON.parse(encodedData.toString("ascii"));
      expect(metadata).to.be.an("object");
    });

    it("Should return the correct royalty basis points value", async () => {
      const { owner } = await signers();
      const royaltiesBps = random(1000);
      await collection.connect(owner).updateConfig({
        ...runtimeConfig,
        royaltiesBps,
      });

      const contractURI = await collection.contractURI();
      const encodedData = Buffer.from(
        contractURI.replace("data:application/json;base64,", ""),
        "base64"
      );
      const metadata = JSON.parse(encodedData.toString("ascii"));
      expect(metadata.seller_fee_basis_points).to.equal(royaltiesBps);
    });

    it("Should return the correct royalties recipient", async () => {
      const { owner } = await signers();
      const allSigners = await ethers.getSigners();
      const royaltiesSigner = allSigners[random(allSigners.length) - 1];
      await collection.connect(owner).updateConfig({
        ...runtimeConfig,
        royaltiesAddress: royaltiesSigner.address,
      });

      const contractURI = await collection.contractURI();
      const encodedData = Buffer.from(
        contractURI.replace("data:application/json;base64,", ""),
        "base64"
      );
      const metadata = JSON.parse(encodedData.toString("ascii"));
      expect(metadata.fee_recipient).to.equal(
        royaltiesSigner.address.toLowerCase()
      );
    });
  });

  describe("Configuration", () => {
    it("Should be updatable by admin roles", async () => {
      const { deployer } = await signers();
      await expect(collection.connect(deployer).updateConfig(runtimeConfig)).not
        .to.be.reverted;
    });

    it("Should be updatable by the owner", async () => {
      const { owner } = await signers();
      await expect(collection.connect(owner).updateConfig(runtimeConfig)).not.to
        .be.reverted;
    });

    it("Should not be updatable by external users", async () => {
      const { external } = await signers();
      await expect(
        collection.connect(external).updateConfig(runtimeConfig)
      ).to.be.revertedWith("AccessControl: account 0x");
    });

    describeVariable("name", (it) => {
      it.isDeploymentConfiguration();
      it.isInitializedTo(deploymentDefaults.name);
    });

    describeVariable("symbol", (it) => {
      it.isDeploymentConfiguration();
      it.isInitializedTo(deploymentDefaults.symbol);
    });

    describeVariable("maxSupply", (it) => {
      it.isDeploymentConfiguration();
      it.isInitializedTo(deploymentDefaults.maxSupply);
    });

    describeVariable("reservedSupply", (it) => {
      it.isDeploymentConfiguration();
      it.isInitializedTo(deploymentDefaults.reservedSupply);
    });

    describeVariable("publicMintPrice", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.publicMintPrice);
      it.isUpdatableTo(ethers.utils.parseEther(`0.${random(5000)}`));
      it.isFreezable(ethers.utils.parseEther(`0.${random(7000)}`));
    });

    describeVariable("publicMintPriceFrozen", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.publicMintPriceFrozen);
      it.isUpdatableTo(false);
      it.isUpdatableTo(true);
      it.isFreezingFlag();
    });

    describeVariable("presaleMintPrice", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.presaleMintPrice);
      it.isUpdatableTo(ethers.utils.parseEther(`0.${random(3000)}`));
      it.isFreezable(ethers.utils.parseEther(`0.${random(5000)}`));
    });

    describeVariable("presaleMintPriceFrozen", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.presaleMintPriceFrozen);
      it.isUpdatableTo(false);
      it.isUpdatableTo(true);
      it.isFreezingFlag();
    });

    describeVariable("tokensPerMint", (it) => {
      it.isDeploymentConfiguration();
      it.isInitializedTo(deploymentDefaults.tokensPerMint);
    });

    describeVariable("treasuryAddress", (it) => {
      it.isInitializedTo(deploymentDefaults.treasuryAddress);
    });

    describeVariable("publicMintStart", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.publicMintStart);
      it.isUpdatableTo(random(100000));
    });

    describeVariable("baseURI", (it) => {
      it.isRuntimeConfiguration();
      it.isUpdatableTo(`ipfs://${random(100000000)}/`);
      it.isFreezable(`ipfs://${random(100000000)}/`, "metadataFrozen");
    });

    describeVariable("prerevealTokenURI", (it) => {
      it.isRuntimeConfiguration();
      it.isUpdatableTo(`ipfs://${random(100000000)}`);
    });

    describeVariable("presaleMintStart", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(runtimeDefaults.presaleMintStart);
      it.isUpdatableTo(random(100000));
    });

    describeVariable("presaleMerkleRoot", (it) => {
      it.isRuntimeConfiguration();
      it.isUpdatableTo(ethers.utils.hexZeroPad("0x01", 32));
    });

    describeVariable("metadataFrozen", (it) => {
      it.isRuntimeConfiguration();
      it.isInitializedTo(false);
      it.isUpdatableTo(false);
      it.isUpdatableTo(true);
      it.isFreezingFlag();

      it("Should let admins update other configuration if metadata is frozen", async () => {
        await updateConfig({ metadataFrozen: true });

        await expect(updateConfig({ publicMintStart: 0 })).not.to.be.reverted;
      });
    });

    describeVariable("owner", (it) => {
      it.isDeploymentConfiguration();
    });

    describeVariable("royaltiesAddress", (it) => {
      it.isRuntimeConfiguration();
      it.isUpdatableTo(ethers.utils.hexZeroPad(`0x0${random(9)}`, 20));
    });

    describeVariable("royaltiesBps", (it) => {
      it.isRuntimeConfiguration();
      it.isUpdatableTo(random(1000));

      it("Cannot be set to more than 100%", async () => {
        await expect(
          updateConfig({ royaltiesBps: 10000 + random(100) })
        ).to.be.revertedWith("Royalties too high");
      });
    });
  });

  describe("Token supply metrics", () => {
    it("Total supply should be readable", async () => {
      await expect(collection.totalSupply()).not.to.be.reverted;
    });

    it("Total supply should be initialized to 0", async () => {
      expect(await collection.totalSupply()).to.equal(0);
    });

    it("Available supply should be readable", async () => {
      await expect(collection.availableSupply()).not.to.be.reverted;
    });

    it("Available supply should return non-reserved token count", async () => {
      const reservedSupply = random(100);
      const maxSupply = reservedSupply + random(1000);

      [collection] = await deployInstance(
        "NFTCollection",
        { ...deploymentConfig, maxSupply, reservedSupply },
        runtimeConfig
      );

      expect(await collection.availableSupply()).to.equal(
        maxSupply - reservedSupply
      );
    });

    it("Remaining reserves should be readable", async () => {
      await expect(collection.reserveRemaining()).not.to.be.reverted;
    });

    it("Remaining reserves should be initialized to the total reserved supply", async () => {
      const reservedSupply = random(100);

      [collection] = await deployInstance(
        "NFTCollection",
        {
          ...deploymentConfig,
          maxSupply: reservedSupply + random(1000),
          reservedSupply,
        },
        runtimeConfig
      );

      expect(await collection.reserveRemaining()).to.equal(reservedSupply);
    });
  });

  describe("Presale", () => {
    let merkleTree;
    let whitelistedSigners;
    let regularSigners;

    beforeEach(async () => {
      const { deployer, owner, user, external } = await signers();
      whitelistedSigners = [deployer, owner, user];
      regularSigners = [external];

      const nodes = whitelistedSigners.map((signer) =>
        keccak256(signer.address)
      );
      merkleTree = new MerkleTree(nodes, keccak256, {
        sortPairs: true,
      });

      await updateConfig({
        presaleMerkleRoot: merkleTree.getRoot(),
      });
    });

    describe("State", () => {
      it("Should be exposed", async () => {
        await expect(collection.presaleActive()).not.to.be.reverted;
      });

      it("Should return false if a whitelist hasn't been set", async () => {
        [collection] = await deployInstance(
          "NFTCollection",
          deploymentConfig,
          runtimeConfig
        );

        for (const signer of [...whitelistedSigners, ...regularSigners]) {
          expect(
            await collection.isWhitelisted(
              signer.address,
              merkleTree.getHexProof(keccak256(signer.address))
            )
          ).to.be.false;
        }
      });

      it("Should return true if the presale has started", async () => {
        await updateConfig({
          presaleMintStart: 0,
        });

        expect(await collection.presaleActive()).to.be.true;
      });

      it("Should return false if the presale has not started", async () => {
        await updateConfig({
          presaleMintStart: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        });

        expect(await collection.presaleActive()).to.be.false;
      });
    });

    describe("Whitelist status", () => {
      it("Should be exposed", async () => {
        const { user } = await signers();

        await expect(
          collection.isWhitelisted(
            user.address,
            merkleTree.getHexProof(keccak256(user.address))
          )
        ).not.to.be.reverted;
      });

      it("Should return true for whitelisted addresses", async () => {
        for (const signer of whitelistedSigners) {
          expect(
            await collection.isWhitelisted(
              signer.address,
              merkleTree.getHexProof(keccak256(signer.address))
            )
          ).to.be.true;
        }
      });

      it("Should return false for non-whitelisted addresses", async () => {
        const { external } = await signers();
        expect(
          await collection.isWhitelisted(
            external.address,
            merkleTree.getHexProof(keccak256(external.address))
          )
        ).to.be.false;
      });
    });

    describe("Minting", () => {
      beforeEach(async () => {
        await updateConfig({
          presaleMintStart: 0,
          publicMintStart: 0,
        });
      });

      it("Should succeed for whitelisted wallets", async () => {
        for (const signer of whitelistedSigners) {
          const amount = random(deploymentConfig.tokensPerMint);

          await expect(
            collection
              .connect(signer)
              .presaleMint(
                amount,
                merkleTree.getHexProof(keccak256(signer.address)),
                {
                  value: runtimeConfig.presaleMintPrice.mul(amount),
                }
              )
          ).not.to.be.reverted;
        }
      });

      it("Should fail for non-whitelisted wallets", async () => {
        for (const signer of regularSigners) {
          const amount = random(deploymentConfig.tokensPerMint);

          await expect(
            collection
              .connect(signer)
              .presaleMint(
                amount,
                merkleTree.getHexProof(keccak256(signer.address)),
                {
                  value: runtimeConfig.presaleMintPrice.mul(amount),
                }
              )
          ).to.be.revertedWith("Not whitelisted for presale");
        }
      });

      it("Should fail when trying to mint twice", async () => {
        const { user } = await signers();

        await collection.presaleMint(
          1,
          merkleTree.getHexProof(keccak256(user.address)),
          {
            value: runtimeConfig.presaleMintPrice,
          }
        );

        await expect(
          collection.presaleMint(
            1,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: runtimeConfig.presaleMintPrice,
            }
          )
        ).to.be.revertedWith("Already minted");
      });

      it("Should fail when payment does not cover mint costs", async () => {
        const { user } = await signers();
        const amount = random(deploymentConfig.tokensPerMint);

        await expect(
          collection.presaleMint(
            amount,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: runtimeConfig.presaleMintPrice.mul(amount).sub(1),
            }
          )
        ).to.be.revertedWith("Payment too small");
      });

      it("Should refund excess payment", async () => {
        const { user } = await signers();

        const amount = random(deploymentConfig.tokensPerMint);
        const value = runtimeConfig.presaleMintPrice.mul(amount);

        const userBalanceBefore = await ethers.provider.getBalance(
          user.address
        );

        const txn = await (
          await collection.presaleMint(
            amount,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: value.mul(2),
            }
          )
        ).wait();

        const userBalanceAfter = await ethers.provider.getBalance(user.address);

        expect(
          userBalanceAfter
            .add(value)
            .add(txn.gasUsed.mul(txn.effectiveGasPrice))
        ).to.equal(userBalanceBefore);
      });

      it("Should succeed when minting up to the maximum number of tokens per mint", async () => {
        const { user } = await signers();

        await expect(
          collection.presaleMint(
            deploymentConfig.tokensPerMint,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: runtimeConfig.presaleMintPrice.mul(
                deploymentConfig.tokensPerMint
              ),
            }
          )
        ).not.to.be.reverted;
      });

      it("Should fail when minting more than the maximum number of tokens per mint", async () => {
        const { user } = await signers();

        await expect(
          collection.presaleMint(
            deploymentConfig.tokensPerMint + 1,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: runtimeConfig.presaleMintPrice.mul(
                deploymentConfig.tokensPerMint + 1
              ),
            }
          )
        ).to.be.revertedWith("Amount too large");
      });

      itSlow(
        "Should fail when minting more than the maximum supply",
        async () => {
          const { user, owner } = await signers();
          await mint(collection, deploymentConfig.maxSupply - 1);

          await expect(
            collection.presaleMint(
              1,
              merkleTree.getHexProof(keccak256(user.address)),
              {
                value: runtimeConfig.presaleMintPrice,
              }
            )
          ).not.to.be.reverted;
          await expect(
            collection
              .connect(owner)
              .presaleMint(
                1,
                merkleTree.getHexProof(keccak256(owner.address)),
                {
                  value: runtimeConfig.presaleMintPrice,
                }
              )
          ).to.be.revertedWith("Not enough tokens left");
        }
      );

      it("Should fail when minting has not started yet", async () => {
        const { user, owner } = await signers();

        await expect(
          collection.presaleMint(
            1,
            merkleTree.getHexProof(keccak256(user.address)),
            {
              value: runtimeConfig.presaleMintPrice,
            }
          )
        ).not.to.be.reverted;

        await updateConfig({
          presaleMintStart: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        });

        await expect(
          collection
            .connect(owner)
            .presaleMint(1, merkleTree.getHexProof(keccak256(owner.address)), {
              value: runtimeConfig.presaleMintPrice,
            })
        ).to.be.revertedWith("Presale has not started yet");
      });

      it("Should send tokens to the minter", async () => {
        const { user } = await signers();
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.balanceOf(user.address)).to.equal(0);
        await collection.presaleMint(
          amount,
          merkleTree.getHexProof(keccak256(user.address)),
          {
            value: runtimeConfig.presaleMintPrice.mul(amount),
          }
        );
        expect(await collection.balanceOf(user.address)).to.equal(amount);
      });

      it("Should increment total supply", async () => {
        const { user } = await signers();
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.totalSupply()).to.equal(0);
        await collection.presaleMint(
          amount,
          merkleTree.getHexProof(keccak256(user.address)),
          {
            value: runtimeConfig.presaleMintPrice.mul(amount),
          }
        );
        expect(await collection.totalSupply()).to.equal(amount);
      });

      it("Should reduce available supply", async () => {
        const { user } = await signers();
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.availableSupply()).to.equal(
          deploymentConfig.maxSupply
        );
        await collection.presaleMint(
          amount,
          merkleTree.getHexProof(keccak256(user.address)),
          {
            value: runtimeConfig.presaleMintPrice.mul(amount),
          }
        );
        expect(await collection.availableSupply()).to.equal(
          deploymentConfig.maxSupply - amount
        );
      });
    });
  });

  describe("Public sale", () => {
    describe("State", () => {
      it("Should be exposed", async () => {
        await expect(collection.mintingActive()).not.to.be.reverted;
      });

      it("Should return true if the sale has started", async () => {
        await updateConfig({
          publicMintStart: 0,
        });

        expect(await collection.mintingActive()).to.be.true;
      });

      it("Should return false if the sale has not started", async () => {
        await updateConfig({
          publicMintStart: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        });

        expect(await collection.mintingActive()).to.be.false;
      });
    });

    describe("Minting", () => {
      beforeEach(async () => {
        await updateConfig({
          publicMintStart: 0,
        });
      });

      it("Should succeed when enough ether is sent", async () => {
        const amount = random(deploymentConfig.tokensPerMint);
        await expect(
          collection.mint(amount, {
            value: runtimeConfig.publicMintPrice.mul(amount),
          })
        ).not.to.be.reverted;
      });

      it("Should fail when payment does not cover mint costs", async () => {
        const amount = random(deploymentConfig.tokensPerMint);

        await expect(
          collection.mint(amount, {
            value: runtimeConfig.publicMintPrice.mul(amount).sub(1),
          })
        ).to.be.reverted;
      });

      it("Should refund excess payment", async () => {
        const { user } = await signers();

        const amount = random(deploymentConfig.tokensPerMint);
        const value = runtimeConfig.publicMintPrice.mul(amount);

        const userBalanceBefore = await ethers.provider.getBalance(
          user.address
        );

        const txn = await (
          await collection.mint(amount, {
            value: value.mul(2),
          })
        ).wait();

        const userBalanceAfter = await ethers.provider.getBalance(user.address);

        expect(
          userBalanceAfter
            .add(value)
            .add(txn.gasUsed.mul(txn.effectiveGasPrice))
        ).to.equal(userBalanceBefore);
      });

      it("Should succeed when minting up to the maximum number of tokens per mint", async () => {
        for (
          let amount = 1;
          amount <= deploymentConfig.tokensPerMint;
          amount++
        ) {
          await expect(
            collection.mint(amount, {
              value: runtimeConfig.publicMintPrice.mul(amount),
            })
          ).not.to.be.reverted;
        }
      });

      it("Should fail when minting more than the maximum number of tokens per mint", async () => {
        const amount = deploymentConfig.tokensPerMint + 1;

        await expect(
          collection.mint(amount, {
            value: runtimeConfig.publicMintPrice.mul(amount),
          })
        ).to.be.reverted;
      });

      itSlow(
        "Should fail when minting more than the maximum supply",
        async () => {
          await mint(collection, deploymentConfig.maxSupply - 1);

          await expect(
            collection.mint(1, { value: runtimeConfig.publicMintPrice })
          ).not.to.be.reverted;
          await expect(
            collection.mint(1, { value: runtimeConfig.publicMintPrice })
          ).to.be.reverted;
        }
      );

      it("Should fail when minting has not started yet", async () => {
        await expect(
          collection.mint(1, { value: runtimeConfig.publicMintPrice })
        ).not.to.be.reverted;

        await updateConfig({
          publicMintStart: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        });

        await expect(
          collection.mint(1, { value: runtimeConfig.publicMintPrice })
        ).to.be.reverted;
      });

      it("Should send tokens to the minter", async () => {
        const { user } = await signers();
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.balanceOf(user.address)).to.equal(0);
        await collection.mint(amount, {
          value: runtimeConfig.publicMintPrice.mul(amount),
        });
        expect(await collection.balanceOf(user.address)).to.equal(amount);
      });

      it("Should increment total supply", async () => {
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.totalSupply()).to.equal(0);
        await collection.mint(amount, {
          value: runtimeConfig.publicMintPrice.mul(amount),
        });
        expect(await collection.totalSupply()).to.equal(amount);
      });

      it("Should decrease available supply", async () => {
        const amount = random(deploymentConfig.tokensPerMint);

        expect(await collection.availableSupply()).to.equal(
          deploymentConfig.maxSupply
        );
        await collection.mint(amount, {
          value: runtimeConfig.publicMintPrice.mul(amount),
        });
        expect(await collection.availableSupply()).to.equal(
          deploymentConfig.maxSupply - amount
        );
      });
    });
  });

  describe("Reserve minting", () => {
    beforeEach(async () => {
      const { owner, deployer } = await signers();

      [collection] = await deployInstance(
        "NFTCollection",
        { ...deploymentConfig, reservedSupply: 10 },
        runtimeConfig
      );

      await collection
        .connect(owner)
        .grantRole(await collection.ADMIN_ROLE(), deployer.address);
    });

    it("Should be callable by admin roles", async () => {
      const { deployer } = await signers();
      await expect(
        collection.connect(deployer).reserveMint(deployer.address, random(10))
      ).not.to.be.reverted;
    });

    it("Should be callable by the owner", async () => {
      const { owner } = await signers();
      await expect(
        collection.connect(owner).reserveMint(owner.address, random(10))
      ).not.to.be.reverted;
    });

    it("Should not be callable by external users", async () => {
      const { external } = await signers();
      await expect(
        collection.connect(external).reserveMint(external.address, random(10))
      ).to.be.revertedWith("AccessControl: account 0x");
    });

    it("Should mint tokens to the target address", async () => {
      const { deployer, external } = await signers();
      const amount = random(10);

      await collection.connect(deployer).reserveMint(external.address, amount);
      expect(await collection.balanceOf(external.address)).to.equal(amount);
    });

    it("Should fail when trying to mint more than reserves", async () => {
      const { deployer } = await signers();

      await expect(
        collection.connect(deployer).reserveMint(deployer.address, 10)
      ).not.to.be.reverted;
      await expect(
        collection.connect(deployer).reserveMint(deployer.address, 1)
      ).to.be.revertedWith("Not enough reserved");
    });

    it("Should not change available supply", async () => {
      const { deployer } = await signers();

      const availableBefore = await collection.availableSupply();
      await collection
        .connect(deployer)
        .reserveMint(deployer.address, random(10));
      const availableAfter = await collection.availableSupply();
      expect(availableAfter).to.equal(availableBefore);
    });

    it("Should decrease remaining reserves", async () => {
      const { deployer } = await signers();
      const amount = random(10);

      const reservedBefore = await collection.reserveRemaining();
      await collection.connect(deployer).reserveMint(deployer.address, amount);
      const reservedAfter = await collection.reserveRemaining();

      expect(reservedBefore.sub(reservedAfter)).to.equal(amount);
    });
  });

  describe("Metadata", () => {
    const prerevealTokenURI = "ipfs://prereveal";

    beforeEach(async () => {
      await updateConfig({
        prerevealTokenURI,
        publicMintStart: 0,
      });
    });

    it("Should return a token URI for minted tokens", async () => {
      const amount = random(50);
      const tokenId = random(amount) - 1;

      await mint(collection, amount);
      await expect(collection.tokenURI(tokenId)).not.to.be.reverted;
    });

    it("Should not return a token URI for unminted tokens", async () => {
      const amount = random(50);

      await mint(collection, amount);
      await expect(collection.tokenURI(amount)).to.be.reverted;
    });

    it("Should return the pre-reveal token URI for minted tokens before they are revealed", async () => {
      const amount = random(50);
      const tokenId = random(amount) - 1;

      await mint(collection, amount);
      expect(await collection.tokenURI(tokenId)).to.equal(prerevealTokenURI);
    });

    it("Should return the concatted token URI for minted and revealed tokens", async () => {
      const baseURI = `ipfs://baseURI${random(10000)}/`;

      await updateConfig({ baseURI });

      const amount = random(50);
      const tokenId = random(amount) - 1;

      await mint(collection, amount);
      expect(await collection.tokenURI(tokenId)).to.equal(
        `${baseURI}${tokenId}`
      );
    });
  });

  describe("Minting fee withdrawal", () => {
    beforeEach(async () => {
      await updateConfig({
        publicMintStart: 0,
      });
    });

    it("Should not be callable by users", async () => {
      await expect(collection.withdrawFees()).to.be.reverted;
    });

    it("Should be callable by admins", async () => {
      const { owner } = await signers();
      await expect(collection.connect(owner).withdrawFees()).not.to.be.reverted;
    });

    it("Should transfer ETH from the contract to the treasury address", async () => {
      const { owner } = await signers();
      await mint(collection, 10);

      const treasuryBalanceBefore = await ethers.provider.getBalance(
        deploymentConfig.treasuryAddress
      );
      const contractBalanceBefore = await ethers.provider.getBalance(
        collection.address
      );

      await collection.connect(owner).withdrawFees();

      const treasuryBalanceAfter = await ethers.provider.getBalance(
        deploymentConfig.treasuryAddress
      );
      const contractBalanceAfter = await ethers.provider.getBalance(
        collection.address
      );

      expect(contractBalanceAfter).to.equal(0);
      expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(
        contractBalanceBefore
      );
    });
  });

  describe("Supported interfaces", () => {
    it("Uses less than 30k gas", async () => {
      expect(
        // Test with 0x00000000 to make sure the function doesn't
        // return early from one of the superclasses
        (await collection.estimateGas.supportsInterface("0x00000000")).lt(30000)
      ).to.be.true;
    });

    it("ERC165", async () => {
      expect(await collection.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("ERC721", async () => {
      expect(await collection.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("ERC721Metadata", async () => {
      expect(await collection.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("ERC2981", async () => {
      expect(await collection.supportsInterface("0x2a55205a")).to.be.true;
    });
  });
});
