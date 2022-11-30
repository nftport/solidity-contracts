const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");

const { deploy } = require("./utils");
const factoryLib = require("../js/factory");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Factory", () => {
  let factory;
  let template;
  let instance;

  let initData;

  let signers;
  let externalUser;
  let collectionDeployer;
  let factorySigner;
  let factoryOwner;

  function random(range) {
    return Math.floor(Math.random() * range);
  }

  async function getFactory() {
    await deployments.fixture(["Factory"]);
    const factory = await ethers.getContract("Factory");

    return factory.connect(factoryOwner);
  }

  async function deployMockImplementation(name, version) {
    const implementation = await deploy("MockTemplate");
    await implementation.setName(name);
    await implementation.setVersion(version);
    return implementation;
  }

  async function deployTemplate() {
    await factory.registerTemplate(template.address);

    const name = await template.NAME();
    const version = await template.VERSION();

    const deploymentTxn = await factoryLib.deploy(
      collectionDeployer,
      {
        template: name,
        version,
        initData,
        metadata: {
          caller: collectionDeployer.address,
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

    return contract;
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    [
      factoryDeployer,
      factoryOwner,
      factorySigner,
      externalUser,
      collectionDeployer,
    ] = signers;

    factory = await getFactory();
    template = await deploy("MockTemplate");

    const initTxn = await template.populateTransaction.initialize();
    initData = initTxn.data;
  });

  describe("Factory deployment", () => {
    it("Should succeed", async function () {
      await expect(getFactory()).not.to.be.reverted;
    });

    it("Should prevent re-initialization", async () => {
      await expect(
        factory.initialize(factoryOwner.address, factorySigner.address)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Should prevent initialization when deployed directly", async () => {
      const contract = await deploy("Factory");

      await expect(
        contract.initialize(factoryOwner.address, factorySigner.address)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Implementation information", () => {
    it("Should expose latest version", async () => {
      await expect(factory.latestVersion("MockTemplate")).not.to.be.reverted;
    });

    it("Should initialize latest version to 0", async () => {
      expect(await factory.latestVersion("MockTemplate")).to.equal(0);
    });

    it("Should expose latest address", async () => {
      await expect(factory.latestImplementation("MockTemplate")).not.to.be
        .reverted;
    });

    it("Should initialize latest address to the null address", async () => {
      expect(await factory.latestImplementation("MockTemplate")).to.equal(
        NULL_ADDRESS
      );
    });
  });

  describe("Template names", () => {
    it("Should be exposed to the public", async () => {
      await expect(factory.templates()).not.to.be.reverted;
    });

    it("Should be initially empty", async () => {
      const templates = await factory.templates();
      expect(templates.length).to.equal(0);
    });
  });

  describe("Registering template implementations", () => {
    let templateName = "MockNFTTemplate";
    let implementation;
    let olderImplementation;
    let newerImplementation;

    beforeEach(async () => {
      implementation = await deployMockImplementation(templateName, 1_00_01);
      newerImplementation = await deployMockImplementation(
        templateName,
        1_01_00
      );
      olderImplementation = await deployMockImplementation(
        templateName,
        1_00_00
      );
    });

    it("Should succeed when called by admin roles", async () => {
      await expect(
        factory.connect(factoryOwner).registerTemplate(implementation.address)
      ).not.to.be.reverted;
    });

    it("Should fail when called by non-admin roles", async () => {
      await expect(
        factory.connect(externalUser).registerTemplate(implementation.address)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should fail if the implementation address does not point to a contract", async () => {
      await expect(
        factory.connect(factoryOwner).registerTemplate(externalUser.address)
      ).to.be.revertedWith("Not a valid contract");
    });

    it("Should fail if the version already exists", async () => {
      await factory
        .connect(factoryOwner)
        .registerTemplate(implementation.address);

      await expect(
        factory.connect(factoryOwner).registerTemplate(implementation.address)
      ).to.be.revertedWith("Version already exists");
    });

    it("Should fail if the template version is 0", async () => {
      const badTemplate = await deployMockImplementation(templateName, 0);

      await expect(
        factory.connect(factoryOwner).registerTemplate(badTemplate.address)
      ).to.be.revertedWith("Template version must be >0");
    });

    it("Should update the list of templates if a new one has been added", async () => {
      await factory
        .connect(factoryOwner)
        .registerTemplate(implementation.address);
      const templatesAfter = await factory.templates();
      expect(templatesAfter.length).to.equal(1);
      expect(templatesAfter[0]).to.equal(templateName);
    });

    it("Should not update the list of templates if new version of an existing one is added", async () => {
      await factory
        .connect(factoryOwner)
        .registerTemplate(implementation.address);
      await factory
        .connect(factoryOwner)
        .registerTemplate(newerImplementation.address);

      const templatesAfter = await factory.templates();
      expect(templatesAfter.length).to.equal(1);
      expect(templatesAfter[0]).to.equal(templateName);
    });

    it("Should update the latest version & implementation address if a newer version is added", async () => {
      await factory
        .connect(factoryOwner)
        .registerTemplate(implementation.address);

      expect(await factory.latestVersion(templateName)).to.equal(1_00_01);
      expect(await factory.latestImplementation(templateName)).to.equal(
        await implementation.address
      );
    });

    it("Should not update the latest version & implementation address if an older version is added", async () => {
      await factory
        .connect(factoryOwner)
        .registerTemplate(implementation.address);

      await factory
        .connect(factoryOwner)
        .registerTemplate(olderImplementation.address);

      expect(await factory.latestVersion(templateName)).to.equal(1_00_01);
      expect(await factory.latestImplementation(templateName)).to.equal(
        await implementation.address
      );
    });

    it("Should emit an TemplateAdded event", async () => {
      await expect(
        factory.connect(factoryOwner).registerTemplate(implementation.address)
      )
        .to.emit(factory, "TemplateAdded")
        .withArgs(
          templateName,
          await implementation.VERSION(),
          implementation.address
        );
    });
  });

  describe("Template implementations", () => {
    it("Should be exposed to the public", async () => {
      await expect(factory.latestImplementation("MockTemplate")).not.to.be
        .reverted;
    });

    it("Should be initialized to the null address", async () => {
      expect(await factory.latestImplementation("MockTemplate")).to.equal(
        NULL_ADDRESS
      );
    });
  });

  describe("Contract deployments", () => {
    let goodCaller;
    let badCaller;
    let goodSigner;
    let badSigner;

    const templateName = "MockNFTTemplate";
    const templateVersion = 1_00_00;

    beforeEach(async () => {
      await factory.registerTemplate(template.address);

      goodCaller = signers[random(signers.length)];
      badCaller = signers.find(
        (signer) => signer.address !== goodCaller.address
      );
      goodSigner = factorySigner;
      badSigner = signers.find(
        (signer) => signer.address !== goodSigner.address
      );

      const currentImplementation = await deployMockImplementation(
        templateName,
        templateVersion
      );
      await factory.registerTemplate(currentImplementation.address);
    });

    it("Should succeed if a valid signature is provided", async () => {
      await expect(
        factoryLib.deploy(
          goodCaller,
          {
            template: templateName,
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          goodSigner
        )
      ).not.to.be.reverted;
    });

    it("Should fail if an invalid signature is provided", async () => {
      await expect(
        factoryLib.deploy(
          goodCaller,
          {
            template: templateName,
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          badSigner
        )
      ).to.be.revertedWith("Signer not recognized");
    });

    it("Should fail if the caller doesn't match the signature", async () => {
      await expect(
        factoryLib.deploy(
          badCaller,
          {
            template: templateName,
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          goodSigner
        )
      ).to.be.revertedWith("Wrong caller");
    });

    it("Should fail if the request has expired", async () => {
      await expect(
        factoryLib.deploy(
          goodCaller,
          {
            template: templateName,
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) - 1,
            },
          },
          goodSigner
        )
      ).to.be.revertedWith("Request expired");
    });

    it("Should fail if the implementation is not set", async () => {
      await expect(
        factoryLib.deploy(
          goodCaller,
          {
            template: "MockTemplates",
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          goodSigner
        )
      ).to.be.revertedWith("Missing implementation");
    });

    it("Should emit a TemplateDeployed event on deployment", async () => {
      await expect(
        factoryLib.deploy(
          goodCaller,
          {
            template: templateName,
            version: templateVersion,
            initData,
            metadata: {
              caller: goodCaller.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          goodSigner
        )
      )
        .to.emit(factory, "TemplateDeployed")
        .withArgs(templateName, templateVersion, []);
    });

    it("Should deploy the specified version", async () => {
      const olderImplementation = await deployMockImplementation(
        templateName,
        templateVersion - 1
      );
      const newerImplementation = await deployMockImplementation(
        templateName,
        templateVersion + 1
      );

      await factory.registerTemplate(olderImplementation.address);
      await factory.registerTemplate(newerImplementation.address);

      for (const implementation of [olderImplementation, newerImplementation]) {
        const version = await implementation.VERSION();

        await expect(
          factoryLib.deploy(
            goodCaller,
            {
              template: templateName,
              version,
              initData,
              metadata: {
                caller: goodCaller.address,
                expiration: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            goodSigner
          )
        )
          .to.emit(factory, "TemplateDeployed")
          .withArgs(templateName, version, []);
      }
    });
  });

  describe("Whitelist status", () => {
    beforeEach(async () => {
      instance = await deployTemplate();
    });

    it("Should be exposed to the public", async () => {
      await expect(factory.whitelisted(instance.address)).not.to.be.reverted;
    });

    it("Should default to true for newly deployed contracts", async () => {
      expect(await factory.whitelisted(instance.address)).to.be.true;
    });

    it("Should be updatable by admins", async () => {
      await expect(factory.setWhitelisted(instance.address, true)).not.to.be
        .reverted;
    });

    it("Should not be updatable by external users", async () => {
      await expect(
        factory.connect(externalUser).setWhitelisted(instance.address, true)
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should change when updated", async () => {
      await factory.setWhitelisted(instance.address, false);
      expect(await factory.whitelisted(instance.address)).to.be.false;
    });
  });

  describe("Operator role", () => {
    beforeEach(async () => {
      instance = await deployTemplate();
    });

    it("Should be generated from instance address", async () => {
      expect(await factory.OPERATOR_ROLE(instance.address)).to.equal(
        "0x" +
          keccak256(
            ethers.utils.solidityPack(
              ["address", "string"],
              [instance.address, "OPERATOR"]
            )
          ).toString("hex")
      );
    });

    it("Should let anyone query its status", async () => {
      await expect(
        factory.isOperator(instance.address, collectionDeployer.address)
      ).not.to.be.reverted;
    });

    it("Should be assigned to the deployer", async () => {
      expect(
        await factory.isOperator(instance.address, collectionDeployer.address)
      ).to.be.true;
    });

    it("Should be callable by factory admins", async () => {
      await expect(
        factory
          .connect(factoryOwner)
          .setOperator(instance.address, externalUser.address, true)
      ).not.to.be.reverted;

      await expect(
        factory
          .connect(factoryOwner)
          .setOperator(instance.address, externalUser.address, false)
      ).not.to.be.reverted;
    });

    it("Should not be callable by anyone else", async () => {
      await expect(
        factory
          .connect(externalUser)
          .setOperator(instance.address, collectionDeployer.address, true)
      ).to.be.revertedWith("AccessControl: account 0x");
    });

    it("Should update role state when changed", async () => {
      await factory
        .connect(factoryOwner)
        .setOperator(instance.address, externalUser.address, true);
      expect(await factory.isOperator(instance.address, externalUser.address))
        .to.be.true;

      await factory
        .connect(factoryOwner)
        .setOperator(instance.address, externalUser.address, false);
      expect(await factory.isOperator(instance.address, externalUser.address))
        .to.be.false;
    });

    it("Should emit an OperatorChanged event when changed", async () => {
      await expect(
        factory
          .connect(factoryOwner)
          .setOperator(instance.address, externalUser.address, true)
      )
        .to.emit(factory, "OperatorChanged")
        .withArgs(instance.address, externalUser.address, true);
    });
  });

  describe("Contract calls", () => {
    let callData;

    beforeEach(async () => {
      instance = await deployTemplate();
      callData = (await instance.populateTransaction.setName("MockTemplate"))
        .data;
    });

    it("Should succeed if a valid signature is provided", async () => {
      await expect(
        factoryLib.call(
          collectionDeployer,
          {
            instance: instance.address,
            callData,
            metadata: {
              caller: collectionDeployer.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          factorySigner
        )
      ).not.to.be.reverted;
    });

    it("Should fail if an invalid signature is provided", async () => {
      await expect(
        factoryLib.call(
          collectionDeployer,
          {
            instance: instance.address,
            callData,
            metadata: {
              caller: collectionDeployer.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          collectionDeployer
        )
      ).to.be.revertedWith("Signer not recognized");
    });

    it("Should fail if the request has expired", async () => {
      await expect(
        factoryLib.call(
          collectionDeployer,
          {
            instance: instance.address,
            callData,
            metadata: {
              caller: collectionDeployer.address,
              expiration: Math.floor(Date.now() / 1000) - 1,
            },
          },
          factorySigner
        )
      ).to.be.revertedWith("Request expired");
    });

    it("Should fail if called by non-operators", async () => {
      const nonOperators = signers.filter(
        (s) => s.address !== collectionDeployer.address
      );

      for (const caller of nonOperators) {
        await expect(
          factoryLib.call(
            caller,
            {
              instance: instance.address,
              callData,
              metadata: {
                caller: caller.address,
                expiration: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            factorySigner
          )
        ).to.be.revertedWith("Access denied");
      }
    });

    it("Should fail if the contract is not whitelisted", async () => {
      await factory.setWhitelisted(instance.address, false);

      await expect(
        factoryLib.call(
          collectionDeployer,
          {
            instance: instance.address,
            callData,
            metadata: {
              caller: collectionDeployer.address,
              expiration: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          factorySigner
        )
      ).to.be.revertedWith("Contract not whitelisted");
    });
  });

  describe("Admin role", () => {
    let ADMIN_ROLE;

    beforeEach(async () => {
      ADMIN_ROLE = await factory.ADMIN_ROLE();
    });

    it("Should be assigned to the owner", async () => {
      expect(factory.hasRole(ADMIN_ROLE, factoryOwner.address));
    });

    it("Should let admin addresses grant the role", async () => {
      await expect(factory.grantRole(ADMIN_ROLE, externalUser.address)).not.to
        .be.reverted;
      expect(await factory.hasRole(ADMIN_ROLE, externalUser.address)).to.be
        .true;
    });

    it("Should not let external addresses grant the role", async () => {
      await expect(
        factory
          .connect(externalUser)
          .grantRole(ADMIN_ROLE, externalUser.address)
      ).to.be.revertedWith("AccessControl: account 0x");
      expect(await factory.hasRole(ADMIN_ROLE, externalUser.address)).to.be
        .false;
    });

    it("Should let admins revoke the role", async () => {
      await factory.grantRole(ADMIN_ROLE, externalUser.address);
      await expect(factory.revokeRole(ADMIN_ROLE, externalUser.address)).not.to
        .be.reverted;
      expect(await factory.hasRole(ADMIN_ROLE, externalUser.address)).to.be
        .false;
    });

    it("Should not let external users revoke the role", async () => {
      await expect(
        factory
          .connect(externalUser)
          .revokeRole(ADMIN_ROLE, factoryOwner.address)
      ).to.be.revertedWith("AccessControl: account 0x");
      expect(await factory.hasRole(ADMIN_ROLE, factoryOwner.address)).to.be
        .true;
    });
  });

  describe("Signer role", () => {
    let SIGNER_ROLE;

    beforeEach(async () => {
      SIGNER_ROLE = await factory.SIGNER_ROLE();
    });

    it("Should be assigned to the signer", async () => {
      expect(factory.hasRole(SIGNER_ROLE, factorySigner.address));
    });

    it("Should let admin addresses grant the role", async () => {
      await expect(factory.grantRole(SIGNER_ROLE, externalUser.address)).not.to
        .be.reverted;
      expect(await factory.hasRole(SIGNER_ROLE, externalUser.address)).to.be
        .true;
    });

    it("Should not let external addresses grant the role", async () => {
      await expect(
        factory
          .connect(externalUser)
          .grantRole(SIGNER_ROLE, externalUser.address)
      ).to.be.revertedWith("AccessControl: account 0x");
      expect(await factory.hasRole(SIGNER_ROLE, externalUser.address)).to.be
        .false;
    });

    it("Should let admins revoke the role", async () => {
      await factory.grantRole(SIGNER_ROLE, externalUser.address);
      await expect(factory.revokeRole(SIGNER_ROLE, externalUser.address)).not.to
        .be.reverted;
      expect(await factory.hasRole(SIGNER_ROLE, externalUser.address)).to.be
        .false;
    });

    it("Should not let external users revoke the role", async () => {
      await expect(
        factory
          .connect(externalUser)
          .revokeRole(SIGNER_ROLE, factorySigner.address)
      ).to.be.revertedWith("AccessControl: account 0x");
      expect(await factory.hasRole(SIGNER_ROLE, factorySigner.address)).to.be
        .true;
    });
  });

  describe("Contract upgrades", () => {
    beforeEach(async () => {
      factory = await deploy("Factory");
    });

    it("Should succeed when called by anyone", async () => {
      const caller = signers[random(signers.length)];

      await expect(factory.connect(caller).upgrade()).not.to.be.reverted;
    });

    it("Should update contract version", async () => {
      expect(await factory.version()).not.to.equal(
        await factory.CODE_VERSION()
      );
      await factory.upgrade();
      expect(await factory.version()).to.equal(await factory.CODE_VERSION());
    });

    it("Should fail when already up-to-date", async () => {
      await factory.upgrade();
      await expect(factory.upgrade()).to.be.revertedWith("Already upgraded");
    });
  });
});
