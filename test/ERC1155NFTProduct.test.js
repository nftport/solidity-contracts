const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");

const {
  random,
  randomChoice,
  signers,
  deploy,
  deployInstance,
} = require("./utils");
const {
  deploymentDefaults,
  runtimeDefaults,
} = require("./ERC1155NFTProduct.utils");

describe("ERC1155NFTProduct", () => {
  let contract;

  // Signers
  let allSigners;
  let namedSigners;
  let unnamedSigners;

  // Roles
  let MINT_ROLE;
  let UPDATE_TOKEN_ROLE;
  let TRANSFER_ROLE;
  let BURN_ROLE;
  let UPDATE_CONTRACT_ROLE;
  let ADMIN_ROLE;
  let regularRoles;

  before(async () => {
    allSigners = await ethers.getSigners();
    namedSigners = await signers();
    unnamedSigners = allSigners.filter(
      (signer) =>
        !Object.values(namedSigners)
          .map((signer) => signer.address)
          .includes(signer.address)
    );
  });

  beforeEach(async () => {
    [contract] = await deployInstance(
      "ERC1155NFTProduct",
      { ...deploymentDefaults, owner: namedSigners.owner.address },
      runtimeDefaults,
      []
    );

    await contract
      .connect(namedSigners.owner)
      .grantRole(await contract.ADMIN_ROLE(), namedSigners.admin.address);

    MINT_ROLE = await contract.MINT_ROLE();
    UPDATE_TOKEN_ROLE = await contract.UPDATE_TOKEN_ROLE();
    TRANSFER_ROLE = await contract.TRANSFER_ROLE();
    BURN_ROLE = await contract.BURN_ROLE();
    UPDATE_CONTRACT_ROLE = await contract.UPDATE_CONTRACT_ROLE();
    ADMIN_ROLE = await contract.ADMIN_ROLE();

    regularRoles = [
      MINT_ROLE,
      BURN_ROLE,
      TRANSFER_ROLE,
      UPDATE_TOKEN_ROLE,
      UPDATE_CONTRACT_ROLE,
    ];
  });

  describe("Deployment", () => {
    describe("Directly", () => {
      it("Should succeed", async () => {
        await expect(deploy("ERC1155NFTProduct")).not.to.be.reverted;
      });

      it("Should prevent initialization", async () => {
        const contract = await deploy("ERC1155NFTProduct");
        await expect(
          contract.initialize(
            { ...deploymentDefaults, owner: namedSigners.owner.address },
            runtimeDefaults,
            []
          )
        ).to.be.revertedWith("Initializable: contract is already initialized");
      });
    });

    describe("Using Factory", () => {
      it("Should succeed with a valid configuration", async () => {
        await expect(
          deployInstance(
            "ERC1155NFTProduct",
            { ...deploymentDefaults, owner: namedSigners.owner.address },
            runtimeDefaults,
            []
          )
        ).not.to.be.reverted;
      });

      it("Should fail when any of the configuration options are missing", async function () {
        for (const key in deploymentDefaults) {
          const invalidConfig = { ...deploymentDefaults };
          delete invalidConfig[key];

          await expect(() =>
            deployInstance(
              "ERC1155NFTProduct",
              invalidConfig,
              runtimeDefaults,
              []
            )
          ).to.throw;
        }

        for (const key in runtimeDefaults) {
          const invalidConfig = { ...runtimeDefaults };
          delete invalidConfig[key];

          await expect(() =>
            deployInstance(
              "ERC1155NFTProduct",
              deploymentDefaults,
              invalidConfig,
              []
            )
          ).to.throw;
        }
      });

      it("Should fail if the owner address is null", async () => {
        await expect(
          deployInstance(
            "ERC1155NFTProduct",
            {
              ...deploymentDefaults,
              owner: "0x0000000000000000000000000000000000000000",
            },
            runtimeDefaults,
            []
          )
        ).to.be.revertedWith("Contract must have an owner");
      });

      it("Should fail if royalties are set to over 100%", async () => {
        await expect(
          deployInstance(
            "ERC1155NFTProduct",
            { ...deploymentDefaults, owner: namedSigners.owner.address },
            { ...runtimeDefaults, royaltiesBps: 10001 },
            []
          )
        ).to.be.revertedWith("Cannot set royalties to over 100%");
      });

      it("Should prevent reinitialization", async () => {
        await expect(
          contract.initialize(
            { owner: namedSigners.owner.address, ...deploymentDefaults },
            runtimeDefaults,
            []
          )
        ).to.be.revertedWith("Initializable: contract is already initialized");
      });

      it("Should initialize contract configuration", async () => {
        // Mapping for properties that have different names in
        // the configuration object and contract itself
        const propertyMappings = { royaltiesBps: "royaltiesBasisPoints" };

        for (const key of Object.keys(deploymentDefaults)) {
          expect(await contract[propertyMappings[key] || key]()).to.equal(
            deploymentDefaults[key]
          );
        }

        for (const key of Object.keys(runtimeDefaults)) {
          expect(await contract[propertyMappings[key] || key]()).to.equal(
            runtimeDefaults[key]
          );
        }
      });
    });
  });

  describe("Contract version", () => {
    it("Should be readable", async () => {
      await expect(contract.VERSION()).not.to.be.reverted;
    });

    it("Should be set to 1_00_01", async () => {
      expect(await contract.VERSION()).to.equal(1_00_01);
    });
  });

  describe("Supported interfaces", () => {
    it("Uses less than 30k gas", async () => {
      expect(
        // Test with 0x00000000 to make sure the function doesn't
        // return early from one of the superclasses
        (await contract.estimateGas.supportsInterface("0x00000000")).lt(30000)
      ).to.be.true;
    });

    it("ERC165", async () => {
      expect(await contract.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("ERC2981", async () => {
      expect(await contract.supportsInterface("0x2a55205a")).to.be.true;
    });
  });

  describe("ERC2981 royalties", () => {
    it("Should be publicly callable", async () => {
      const tokenId = random(1000);
      await expect(
        contract.royaltyInfo(tokenId, ethers.utils.parseEther("1.0"))
      ).not.to.be.reverted;
    });

    it("Should return the royalties address as the receiver", async () => {
      const royaltiesRecipient = randomChoice(allSigners);
      await contract.connect(namedSigners.owner).update(
        {
          ...runtimeDefaults,
          royaltiesAddress: royaltiesRecipient.address,
        },
        [],
        false
      );

      const tokenId = random(1000);
      const [receiver] = await contract.royaltyInfo(
        tokenId,
        ethers.utils.parseEther("1.0")
      );

      expect(receiver).to.equal(royaltiesRecipient.address);
    });

    it("Should return the correct royalties amount", async () => {
      const royaltiesPercentage = random(50);
      await contract.connect(namedSigners.owner).update(
        {
          ...runtimeDefaults,
          royaltiesBps: royaltiesPercentage * 100,
        },
        [],
        false
      );
      const salePrice = ethers.utils.parseEther(`${random(100) / 10}`);

      const tokenId = random(1000);
      const [_, amount] = await contract.royaltyInfo(tokenId, salePrice);

      expect(amount).to.equal(salePrice.mul(royaltiesPercentage).div(100));
    });
  });

  describe("Contract metadata", () => {
    it("Should be public", async () => {
      await expect(contract.contractURI()).not.to.be.reverted;
    });

    it("Should return a base64-encoded JSON object", async () => {
      const contractURI = await contract.contractURI();
      const encodedData = Buffer.from(
        contractURI.replace("data:application/json;base64,", ""),
        "base64"
      );
      const metadata = JSON.parse(encodedData.toString("ascii"));
      expect(metadata).to.be.an("object");
    });

    it("Should return the correct royalty basis points value", async () => {
      const royaltiesBps = random(1000);
      await contract.connect(namedSigners.owner).update(
        {
          ...runtimeDefaults,
          royaltiesBps,
        },
        [],
        false
      );

      const contractURI = await contract.contractURI();
      const encodedData = Buffer.from(
        contractURI.replace("data:application/json;base64,", ""),
        "base64"
      );
      const metadata = JSON.parse(encodedData.toString("ascii"));
      expect(metadata.seller_fee_basis_points).to.equal(royaltiesBps);
    });

    it("Should return the correct royalties recipient", async () => {
      const royaltiesSigner = randomChoice(allSigners);
      await contract.connect(namedSigners.owner).update(
        {
          ...runtimeDefaults,
          royaltiesAddress: royaltiesSigner.address,
        },
        [],
        false
      );

      const contractURI = await contract.contractURI();
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

  describe("Minting", () => {
    let minter;
    let recipient;

    beforeEach(async () => {
      minter = randomChoice(unnamedSigners);
      recipient = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: MINT_ROLE,
            addresses: [minter.address],
            frozen: false,
          },
        ],
        false
      );
    });

    it("Should succeed when called by a minter", async () => {
      await expect(
        contract
          .connect(minter)
          .mintByOwner(recipient.address, random(1000), 1, `${random(10000)}`)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract
          .connect(namedSigners.admin)
          .mintByOwner(recipient.address, random(1000), 1, `${random(10000)}`)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract
          .connect(namedSigners.owner)
          .mintByOwner(recipient.address, random(1000), 1, `${random(10000)}`)
      ).not.to.be.reverted;
    });

    it("Should fail when called by a regular user", async () => {
      await expect(
        contract
          .connect(namedSigners.user)
          .mintByOwner(recipient.address, random(1000), 1, `${random(10000)}`)
      ).to.be.revertedWith(
        `AccessControl: account ${namedSigners.user.address.toLowerCase()} is missing role ${MINT_ROLE.toLowerCase()}`
      );
    });

    it("Should mint the specified token to the recipient", async () => {
      const tokenId = random(1000);
      await contract
        .connect(namedSigners.owner)
        .mintByOwner(recipient.address, tokenId, 1, `${random(10000)}`);

      expect(await contract.balanceOf(recipient.address, tokenId)).to.equal(1);
    });

    it("Should set the token URI for minted tokens", async () => {
      const tokenId = random(1000);
      const tokenUri = `${random(10000)}`;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(recipient.address, tokenId, 1, tokenUri);

      expect(await contract.uri(tokenId)).to.equal(tokenUri);
    });

    it("Should increase total supply", async () => {
      const tokenId = random(10);
      const tokenAmount = random(10);

      const supplyBefore = await contract.totalSupply(tokenId);
      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          tokenAmount,
          `${random(10000)}`
        );
      const supplyAfter = await contract.totalSupply(tokenId);

      expect(supplyAfter.gt(supplyBefore)).to.be.true;
      expect(supplyAfter.sub(supplyBefore)).to.equal(tokenAmount);
    });
  });

  describe("Batch minting", () => {
    let minter;
    let recipient;

    beforeEach(async () => {
      minter = randomChoice(unnamedSigners);
      recipient = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: MINT_ROLE,
            addresses: [minter.address],
            frozen: false,
          },
        ],
        false
      );
    });

    it("Should succeed when called by a minter", async () => {
      await expect(
        contract
          .connect(minter)
          .mintByOwnerBatch(
            [recipient.address],
            [random(1000)],
            [1],
            [`${random(10000)}`]
          )
      ).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract
          .connect(namedSigners.admin)
          .mintByOwnerBatch(
            [recipient.address],
            [random(1000)],
            [1],
            [`${random(10000)}`]
          )
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract
          .connect(namedSigners.owner)
          .mintByOwnerBatch(
            [recipient.address],
            [random(1000)],
            [1],
            [`${random(10000)}`]
          )
      ).not.to.be.reverted;
    });

    it("Should fail when called by a regular user", async () => {
      await expect(
        contract
          .connect(namedSigners.user)
          .mintByOwnerBatch(
            [recipient.address],
            [random(1000)],
            [1],
            [`${random(10000)}`]
          )
      ).to.be.revertedWith(
        `AccessControl: account ${namedSigners.user.address.toLowerCase()} is missing role ${MINT_ROLE.toLowerCase()}`
      );
    });

    it("Should fail if the input arrays don't match", async () => {
      const arguments = [
        [recipient.address],
        [random(1000)],
        [1],
        [`${random(10000)}`],
      ];

      for (let i = 0; i < arguments.length; i++) {
        const modifiedArguments = [...arguments];
        modifiedArguments[i] = [
          ...modifiedArguments[i],
          ...modifiedArguments[i],
        ];

        await expect(
          contract
            .connect(namedSigners.owner)
            .mintByOwnerBatch(...modifiedArguments)
        ).to.be.revertedWith("Mismatched input arrays");
      }
    });

    it("Should mint the specified token to the recipient", async () => {
      const tokenId = random(1000);
      await contract
        .connect(namedSigners.owner)
        .mintByOwnerBatch(
          [recipient.address],
          [tokenId],
          [1],
          [`${random(10000)}`]
        );

      expect(await contract.balanceOf(recipient.address, tokenId)).to.equal(1);
    });

    it("Should set the token URI for minted tokens", async () => {
      const tokenId = random(1000);
      const tokenUri = `${random(10000)}`;

      await contract
        .connect(namedSigners.owner)
        .mintByOwnerBatch([recipient.address], [tokenId], [1], [tokenUri]);

      expect(await contract.uri(tokenId)).to.equal(tokenUri);
    });

    it("Should increase total supply", async () => {
      const tokenId = random(10);
      const tokenAmount = random(10);

      const supplyBefore = await contract.totalSupply(tokenId);
      await contract
        .connect(namedSigners.owner)
        .mintByOwnerBatch(
          [namedSigners.owner.address],
          [tokenId],
          [tokenAmount],
          [`${random(10000)}`]
        );
      const supplyAfter = await contract.totalSupply(tokenId);

      expect(supplyAfter.gt(supplyBefore)).to.be.true;
      expect(supplyAfter.sub(supplyBefore)).to.equal(tokenAmount);
    });
  });

  describe("Token URI updates", () => {
    let tokenId;
    let updater;

    beforeEach(async () => {
      tokenId = random(10000);
      updater = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: UPDATE_TOKEN_ROLE,
            addresses: [updater.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(UPDATE_TOKEN_ROLE, updater.address)).to.be
        .true;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );
    });

    it("Should succeed when called by a token updater", async () => {
      await expect(
        contract
          .connect(updater)
          .updateTokenUri(tokenId, `ipfs://${tokenId}-updated`, false)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract
          .connect(namedSigners.admin)
          .updateTokenUri(tokenId, `ipfs://${tokenId}-updated`, false)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract
          .connect(namedSigners.owner)
          .updateTokenUri(tokenId, `ipfs://${tokenId}-updated`, false)
      ).not.to.be.reverted;
    });

    it("Should fail if the token doesn't exist", async () => {
      await expect(
        contract
          .connect(updater)
          .updateTokenUri(tokenId + 1, `ipfs://${tokenId + 1}-updated`, false)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should fail if all metadata has been frozen", async () => {
      await contract
        .connect(namedSigners.owner)
        .update({ ...runtimeDefaults, metadataUpdatable: false }, [], false);

      await expect(
        contract
          .connect(updater)
          .updateTokenUri(tokenId, `ipfs://${tokenId}`, false)
      ).to.be.revertedWith("Metadata is frozen");
    });

    it("Should fail if token metadata has been frozen", async () => {
      await contract
        .connect(updater)
        .updateTokenUri(tokenId, `ipfs://${tokenId}-updated`, true);

      await expect(
        contract
          .connect(updater)
          .updateTokenUri(tokenId, `ipfs://${tokenId}`, false)
      ).to.be.revertedWith("Token is frozen");
    });

    it("Should fail if token URI is blank and metadata isn't frozen", async () => {
      await expect(
        contract.connect(updater).updateTokenUri(tokenId, "", false)
      ).to.be.revertedWith("Either _newUri or _isFreezeTokenUri=true required");
    });

    it("Should update token URI", async () => {
      const newUri = `ipfs://${random(10000)}-updated`;

      await contract.connect(updater).updateTokenUri(tokenId, newUri, false);

      expect(await contract.uri(tokenId)).to.equal(newUri);
    });

    it("Should freeze token metadata if flag was set", async () => {
      await contract
        .connect(updater)
        .updateTokenUri(tokenId, `ipfs://${tokenId}-updated`, true);

      expect(await contract.freezeTokenUris(tokenId)).to.be.true;
    });

    it("Should not change token URI when freezing with an empty URI value", async () => {
      await contract.connect(updater).updateTokenUri(tokenId, "", true);

      expect(await contract.uri(tokenId)).to.equal(`ipfs://${tokenId}`);
    });

    it("Should emit a PermanentURI event when freezing metadata", async () => {
      const newUri = `ipfs://${tokenId}-updated`;

      await expect(
        contract.connect(updater).updateTokenUri(tokenId, newUri, true)
      )
        .to.emit(contract, "PermanentURI")
        .withArgs(newUri, tokenId);
    });
  });

  describe("Transfers", () => {
    let tokenId;
    let transferrer;
    let recipient;

    beforeEach(async () => {
      tokenId = random(10000);
      transferrer = randomChoice(unnamedSigners);
      recipient = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: TRANSFER_ROLE,
            addresses: [transferrer.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(TRANSFER_ROLE, transferrer.address)).to.be
        .true;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(1);
    });

    it("Should succeed when called by the transfer role", async () => {
      await expect(
        contract
          .connect(transferrer)
          .transferByOwner(recipient.address, tokenId, 1)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract
          .connect(namedSigners.admin)
          .transferByOwner(recipient.address, tokenId, 1)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract
          .connect(namedSigners.owner)
          .transferByOwner(recipient.address, tokenId, 1)
      ).not.to.be.reverted;
    });

    it("Should move the token to the target address", async () => {
      await contract
        .connect(transferrer)
        .transferByOwner(recipient.address, tokenId, 1);

      expect(await contract.balanceOf(recipient.address, tokenId)).to.equal(1);
    });

    it("Should fail if token transfers are disabled", async () => {
      await await contract
        .connect(namedSigners.owner)
        .update({ ...runtimeDefaults, tokensTransferable: false }, [], false);

      await expect(
        contract
          .connect(transferrer)
          .transferByOwner(recipient.address, tokenId, 1)
      ).to.be.revertedWith("Transfers are disabled");
    });

    it("Should fail if the token isn't held by the owner", async () => {
      await contract
        .connect(namedSigners.owner)
        .safeTransferFrom(
          namedSigners.owner.address,
          namedSigners.user.address,
          tokenId,
          1,
          []
        );

      await expect(
        contract
          .connect(transferrer)
          .transferByOwner(recipient.address, tokenId, 1)
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");
    });

    it("Should fail if the token doesn't exist", async () =>
      await expect(
        contract
          .connect(transferrer)
          .transferByOwner(recipient.address, tokenId + 1, 1)
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer"));
  });

  describe("Batch transfers", () => {
    let tokenId;
    let transferrer;
    let recipient;

    beforeEach(async () => {
      tokenId = random(10000);
      transferrer = randomChoice(unnamedSigners);
      recipient = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: TRANSFER_ROLE,
            addresses: [transferrer.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(TRANSFER_ROLE, transferrer.address)).to.be
        .true;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(1);
    });

    it("Should succeed when called by the transfer role", async () => {
      await expect(
        contract
          .connect(transferrer)
          .transferByOwnerBatch([recipient.address], [tokenId], [1])
      ).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract
          .connect(namedSigners.admin)
          .transferByOwnerBatch([recipient.address], [tokenId], [1])
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract
          .connect(namedSigners.owner)
          .transferByOwnerBatch([recipient.address], [tokenId], [1])
      ).not.to.be.reverted;
    });

    it("Should fail if the input arrays don't match", async () => {
      const arguments = [[recipient.address], [tokenId], [1]];

      for (let i = 0; i < arguments.length; i++) {
        const modifiedArguments = [...arguments];
        modifiedArguments[i] = [
          ...modifiedArguments[i],
          ...modifiedArguments[i],
        ];

        await expect(
          contract
            .connect(namedSigners.owner)
            .transferByOwnerBatch(...modifiedArguments)
        ).to.be.revertedWith("Mismatched input arrays");
      }
    });

    it("Should move the token to the target address", async () => {
      await contract
        .connect(transferrer)
        .transferByOwnerBatch([recipient.address], [tokenId], [1]);

      expect(await contract.balanceOf(recipient.address, tokenId)).to.equal(1);
    });

    it("Should fail if token transfers are disabled", async () => {
      await await contract
        .connect(namedSigners.owner)
        .update({ ...runtimeDefaults, tokensTransferable: false }, [], false);

      await expect(
        contract
          .connect(transferrer)
          .transferByOwnerBatch([recipient.address], [tokenId], [1])
      ).to.be.revertedWith("Transfers are disabled");
    });

    it("Should fail if the token isn't held by the owner", async () => {
      await contract
        .connect(namedSigners.owner)
        .safeTransferFrom(
          namedSigners.owner.address,
          namedSigners.user.address,
          tokenId,
          1,
          []
        );

      await expect(
        contract
          .connect(transferrer)
          .transferByOwnerBatch([recipient.address], [tokenId], [1])
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");
    });

    it("Should fail if the token doesn't exist", async () =>
      await expect(
        contract
          .connect(transferrer)
          .transferByOwnerBatch([recipient.address], [tokenId + 1], [1])
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer"));
  });

  describe("Burns", () => {
    let tokenId;
    let burner;

    beforeEach(async () => {
      tokenId = random(10000);
      burner = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: BURN_ROLE,
            addresses: [burner.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(BURN_ROLE, burner.address)).to.be.true;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(1);
    });

    it("Should succeed when called by the burn role", async () => {
      await expect(contract.connect(burner).burn(tokenId, 1)).not.to.be
        .reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(contract.connect(namedSigners.admin).burn(tokenId, 1)).not.to
        .be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(contract.connect(namedSigners.owner).burn(tokenId, 1)).not.to
        .be.reverted;
    });

    it("Should burn the token", async () => {
      await contract.connect(burner).burn(tokenId, 1);

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(0);
    });

    it("Should emit a burn event", async () => {
      await expect(contract.connect(burner).burn(tokenId, 1)).to.emit(
        contract,
        "TransferSingle"
      );
    });

    it("Should fail if token burns are disabled", async () => {
      [contract] = await deployInstance(
        "ERC1155NFTProduct",
        {
          ...deploymentDefaults,
          tokensBurnable: false,
          owner: namedSigners.owner.address,
        },
        runtimeDefaults,
        []
      );

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      await expect(
        contract.connect(namedSigners.owner).burn(tokenId, 1)
      ).to.be.revertedWith("Burns are disabled");
    });

    it("Should fail if the token isn't held by the owner", async () => {
      await contract
        .connect(namedSigners.owner)
        .safeTransferFrom(
          namedSigners.owner.address,
          namedSigners.user.address,
          tokenId,
          1,
          []
        );

      await expect(
        contract.connect(burner).burn(tokenId, 1)
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });

    it("Should fail if the token doesn't exist", async () => {
      await expect(
        contract.connect(burner).burn(tokenId + 1, 1)
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });

    it("Should decrease total supply", async () => {
      const supplyBefore = await contract.totalSupply(tokenId);
      await contract.connect(burner).burn(tokenId, 1);
      const supplyAfter = await contract.totalSupply(tokenId);

      expect(supplyAfter.lt(supplyBefore)).to.be.true;
      expect(supplyBefore.sub(supplyAfter)).to.equal(1);
    });
  });

  describe("Batch burns", () => {
    let tokenId;
    let burner;

    beforeEach(async () => {
      tokenId = random(10000);
      burner = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: BURN_ROLE,
            addresses: [burner.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(BURN_ROLE, burner.address)).to.be.true;

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(1);
    });

    it("Should succeed when called by the burn role", async () => {
      await expect(contract.connect(burner).burnBatch([tokenId], [1])).not.to.be
        .reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract.connect(namedSigners.admin).burnBatch([tokenId], [1])
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract.connect(namedSigners.owner).burnBatch([tokenId], [1])
      ).not.to.be.reverted;
    });

    it("Should fail if the input arrays don't match", async () => {
      const arguments = [[tokenId], [1]];

      for (let i = 0; i < arguments.length; i++) {
        const modifiedArguments = [...arguments];
        modifiedArguments[i] = [
          ...modifiedArguments[i],
          ...modifiedArguments[i],
        ];

        await expect(
          contract.connect(namedSigners.owner).burnBatch(...modifiedArguments)
        ).to.be.revertedWith("ERC1155: ids and amounts length mismatch");
      }
    });

    it("Should burn the token", async () => {
      await contract.connect(burner).burnBatch([tokenId], [1]);

      expect(
        await contract.balanceOf(namedSigners.owner.address, tokenId)
      ).to.equal(0);
    });

    it("Should emit a burn event", async () => {
      await expect(contract.connect(burner).burnBatch([tokenId], [1])).to.emit(
        contract,
        "TransferBatch"
      );
    });

    it("Should fail if token burns are disabled", async () => {
      [contract] = await deployInstance(
        "ERC1155NFTProduct",
        {
          ...deploymentDefaults,
          tokensBurnable: false,
          owner: namedSigners.owner.address,
        },
        runtimeDefaults,
        []
      );

      await contract
        .connect(namedSigners.owner)
        .mintByOwner(
          namedSigners.owner.address,
          tokenId,
          1,
          `ipfs://${tokenId}`
        );

      await expect(
        contract.connect(namedSigners.owner).burnBatch([tokenId], [1])
      ).to.be.revertedWith("Burns are disabled");
    });

    it("Should fail if the token isn't held by the owner", async () => {
      await contract
        .connect(namedSigners.owner)
        .safeTransferFrom(
          namedSigners.owner.address,
          namedSigners.user.address,
          tokenId,
          1,
          []
        );

      await expect(
        contract.connect(burner).burnBatch([tokenId], [1])
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });

    it("Should fail if the token doesn't exist", async () => {
      await expect(
        contract.connect(burner).burnBatch([tokenId + 1], [1])
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });

    it("Should decrease total supply", async () => {
      const supplyBefore = await contract.totalSupply(tokenId);
      await contract.connect(burner).burnBatch([tokenId], [1]);
      const supplyAfter = await contract.totalSupply(tokenId);

      expect(supplyAfter.lt(supplyBefore)).to.be.true;
      expect(supplyBefore.sub(supplyAfter)).to.equal(1);
    });
  });

  describe("Contract updates", () => {
    let updater;

    beforeEach(async () => {
      updater = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: UPDATE_CONTRACT_ROLE,
            addresses: [updater.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(UPDATE_CONTRACT_ROLE, updater.address)).to
        .be.true;
    });

    it("Should succeed when called by the updater role", async () => {
      await expect(contract.connect(updater).update(runtimeDefaults, [], false))
        .not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(
        contract.connect(namedSigners.admin).update(runtimeDefaults, [], false)
      ).not.to.be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(
        contract.connect(namedSigners.owner).update(runtimeDefaults, [], false)
      ).not.to.be.reverted;
    });

    it("Should fail when called by a non-privileged role", async () => {
      const signer = randomChoice(
        unnamedSigners.filter(
          (s) =>
            ![
              namedSigners.owner.address,
              namedSigners.admin.address,
              updater.address,
            ].includes(s.address)
        )
      );

      await expect(
        contract.connect(signer).update(runtimeDefaults, [], false)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should fail if the config is missing any properties", async () => {
      const invalidConfig = { ...runtimeDefaults };
      for (const key of Object.keys(invalidConfig)) {
        delete invalidConfig[key];
      }

      await expect(contract.connect(updater).update(invalidConfig, [], false))
        .to.be.reverted;
    });

    it("Should change property values when configuration is updated", async () => {
      const propertyMappings = { royaltiesBps: "royaltiesBasisPoints" };
      const updatedValues = {
        baseURI: `${random(10000)}`,
        royaltiesAddress: ethers.utils.hexZeroPad(`0x0${random(9)}`, 20),
        royaltiesBps: random(1000),
        tokensTransferable: false,
        metadataUpdatable: false,
      };

      for (const key of Object.keys(updatedValues)) {
        await expect(
          contract
            .connect(updater)
            .update(
              { ...runtimeDefaults, [key]: updatedValues[key] },
              [],
              false
            )
        ).not.to.be.reverted;

        expect(await contract[propertyMappings[key] || key]()).to.equal(
          updatedValues[key]
        );
      }
    });

    it("Should not re-enable token transfers", async () => {
      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, tokensTransferable: false }, [], false);

      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, tokensTransferable: true }, [], false);

      expect(await contract.tokensTransferable()).to.equal(false);
    });

    it("Should not re-enable metadata updates", async () => {
      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, metadataUpdatable: false }, [], false);

      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, metadataUpdatable: true }, [], false);

      expect(await contract.metadataUpdatable()).to.equal(false);
    });

    it("Should fail when trying to update a frozen baseURI", async () => {
      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, metadataUpdatable: false }, [], false);

      await expect(
        contract.connect(updater).update(
          {
            ...runtimeDefaults,
            metadataUpdatable: false,
            baseURI: "ipfs://randomURI",
          },
          [],
          false
        )
      ).to.be.revertedWith("Metadata is frozen");
    });

    it("Should fail when trying to set royalties to more than 100%", async () => {
      await expect(
        contract.connect(updater).update(
          {
            ...runtimeDefaults,
            royaltiesBps: 10001,
          },
          [],
          false
        )
      ).to.be.revertedWith("Cannot set royalties to over 100%");
    });

    it("Should succeed when updating any other properties when metadata is frozen", async () => {
      await contract
        .connect(updater)
        .update({ ...runtimeDefaults, metadataUpdatable: false }, [], false);

      await expect(
        contract.connect(updater).update(
          {
            ...runtimeDefaults,
            metadataUpdatable: false,
            royaltiesBps: 420,
          },
          [],
          false
        )
      ).not.to.be.reverted;
    });

    it("Should emit a PermanentURIGlobal event when disabling metadata updates", async () => {
      await expect(
        await contract
          .connect(updater)
          .update({ ...runtimeDefaults, metadataUpdatable: false }, [], false)
      ).to.emit(contract, "PermanentURIGlobal");
    });

    it("Should not let the updater role revoke NFTPort's permissions", async () => {
      await expect(
        contract.connect(updater).update(runtimeDefaults, [], true)
      ).to.be.revertedWith(
        `AccessControl: account ${updater.address.toLowerCase()} is missing role ${ADMIN_ROLE.toLowerCase()}`
      );
    });

    it("Should let admin role revoke NFTPort's permissions", async () => {
      await expect(
        contract.connect(namedSigners.admin).update(runtimeDefaults, [], true)
      ).not.to.be.reverted;
    });

    it("Should let the owner revoke NFTPort's permissions", async () => {
      await expect(
        contract.connect(namedSigners.owner).update(runtimeDefaults, [], true)
      ).not.to.be.reverted;
    });

    it("Should remove ADMIN_ROLE from the factory if NFTPort's permissions are revoked", async () => {
      const factory = await ethers.getContract("Factory");

      await contract
        .connect(namedSigners.owner)
        .update(runtimeDefaults, [], true);

      expect(await contract.hasRole(ADMIN_ROLE, factory.address)).to.be.false;
    });
  });

  describe("setURI", () => {
    let updater;

    beforeEach(async () => {
      updater = randomChoice(unnamedSigners);

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: UPDATE_CONTRACT_ROLE,
            addresses: [updater.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(UPDATE_CONTRACT_ROLE, updater.address)).to
        .be.true;
    });

    it("Should succeed when called by the updater role", async () => {
      await expect(contract.connect(updater).setURI("test")).not.to.be.reverted;
    });

    it("Should succeed when called by an admin", async () => {
      await expect(contract.connect(namedSigners.admin).setURI("test")).not.to
        .be.reverted;
    });

    it("Should succeed when called by the owner", async () => {
      await expect(contract.connect(namedSigners.owner).setURI("test")).not.to
        .be.reverted;
    });

    it("Should fail when called by a non-privileged role", async () => {
      const signer = randomChoice(
        unnamedSigners.filter(
          (s) =>
            ![
              namedSigners.owner.address,
              namedSigners.admin.address,
              updater.address,
            ].includes(s.address)
        )
      );

      await expect(contract.connect(signer).setURI("test")).to.be.revertedWith(
        "AccessControl:"
      );
    });
  });

  describe("Contract ownership", () => {
    it("Should make contract owner public", async () => {
      await expect(contract.owner()).not.to.be.reverted;
    });

    describe("Transfers", () => {
      it("Should succeed when called by the owner", async () => {
        await expect(
          contract
            .connect(namedSigners.owner)
            .transferOwnership(namedSigners.user.address)
        ).not.to.be.reverted;
      });

      it("Should fail when called by an admin", async () => {
        await expect(
          contract
            .connect(namedSigners.admin)
            .transferOwnership(namedSigners.user.address)
        ).to.be.revertedWith("GranularRoles: not the owner");
      });

      it("Should fail when called by a regular user", async () => {
        await expect(
          contract
            .connect(namedSigners.user)
            .transferOwnership(namedSigners.user.address)
        ).to.be.revertedWith("GranularRoles: not the owner");
      });

      it("Should fail when owner address doesn't change", async () => {
        await expect(
          contract
            .connect(namedSigners.owner)
            .transferOwnership(namedSigners.owner.address)
        ).to.be.revertedWith("GranularRoles: already the owner");
      });

      it("Should revoke ADMIN_ROLE from the previous owner", async () => {
        await contract
          .connect(namedSigners.owner)
          .transferOwnership(namedSigners.user.address);

        expect(await contract.hasRole(ADMIN_ROLE, namedSigners.owner.address))
          .to.be.false;
      });

      it("Should grant ADMIN_ROLE to the new owner", async () => {
        await contract
          .connect(namedSigners.owner)
          .transferOwnership(namedSigners.user.address);

        expect(await contract.hasRole(ADMIN_ROLE, namedSigners.user.address)).to
          .be.true;
      });

      it("Should emit an OwnershipTransferred event", async () => {
        await expect(
          contract
            .connect(namedSigners.owner)
            .transferOwnership(namedSigners.user.address)
        )
          .to.emit(contract, "OwnershipTransferred")
          .withArgs(namedSigners.owner.address, namedSigners.user.address);
      });
    });
  });

  describe("Role management", () => {
    let updater;
    let testRole;
    let testRoles;

    beforeEach(async () => {
      testRole = randomChoice(regularRoles);
      updater = randomChoice(unnamedSigners);

      testRoles = regularRoles.map((role) => ({
        role,
        frozen: false,
        addresses: Array.from(new Array(random(3)))
          .fill(null)
          .map(() => randomChoice(unnamedSigners).address),
      }));

      await contract.connect(namedSigners.owner).update(
        runtimeDefaults,
        [
          {
            role: UPDATE_CONTRACT_ROLE,
            addresses: [updater.address],
            frozen: false,
          },
        ],
        false
      );

      expect(await contract.hasRole(UPDATE_CONTRACT_ROLE, updater.address)).to
        .be.true;
    });

    describe("Initialization", () => {
      it("Should assign admin role to the factory contract", async () => {
        const factory = await ethers.getContract("Factory");
        expect(await contract.hasRole(ADMIN_ROLE, factory.address)).to.be.true;
      });

      it("Should assign admin role to the owner", async () => {
        expect(await contract.hasRole(ADMIN_ROLE, namedSigners.owner.address))
          .to.be.true;
      });

      it("Should grant ADMIN_ROLE all regular roles", async () => {
        for (const role of [ADMIN_ROLE, ...regularRoles]) {
          expect(await contract.hasRole(role, namedSigners.admin.address)).to.be
            .true;
        }
      });

      it("Should assign regular roles to the specified addresses", async () => {
        [contract] = await deployInstance(
          "ERC1155NFTProduct",
          { ...deploymentDefaults, owner: namedSigners.owner.address },
          runtimeDefaults,
          testRoles
        );

        for (const roleDefinition of testRoles) {
          for (const address of roleDefinition.addresses) {
            expect(await contract.hasRole(roleDefinition.role, address)).to.be
              .true;
          }
        }
      });

      it("Should fail when trying to assign ADMIN_ROLE", async () => {
        await expect(
          deployInstance(
            "ERC1155NFTProduct",
            { ...deploymentDefaults, owner: namedSigners.owner.address },
            runtimeDefaults,
            [
              {
                role: ADMIN_ROLE,
                addresses: [namedSigners.user.address],
                frozen: false,
              },
            ]
          )
        ).to.be.revertedWith(`GranularRoles: invalid role ${ADMIN_ROLE}`);
      });

      it("Should freeze role when flag is set", async () => {
        [contract] = await deployInstance(
          "ERC1155NFTProduct",
          { ...deploymentDefaults, owner: namedSigners.owner.address },
          runtimeDefaults,
          [
            {
              role: BURN_ROLE,
              addresses: [namedSigners.user.address],
              frozen: true,
            },
          ]
        );

        await expect(
          contract.connect(namedSigners.owner).update(
            runtimeDefaults,
            [
              {
                role: BURN_ROLE,
                addresses: [],
                frozen: false,
              },
            ],
            false
          )
        ).to.be.revertedWith(`GranularRoles: role ${BURN_ROLE} is frozen`);
      });
    });

    describe("Updates", () => {
      it("Should succeed when called by an admin", async () => {
        await expect(
          contract
            .connect(namedSigners.admin)
            .update(runtimeDefaults, testRoles, false)
        ).not.to.be.reverted;
      });

      it("Should succeed when called by the owner", async () => {
        await expect(
          contract
            .connect(namedSigners.admin)
            .update(runtimeDefaults, testRoles, false)
        ).not.to.be.reverted;
      });

      it("Should fail when called by an updater", async () => {
        await expect(
          contract.connect(updater).update(runtimeDefaults, testRoles, false)
        ).to.be.revertedWith("GranularRoles: not an admin");
      });

      it("Should assign roles to addresses", async () => {
        await contract
          .connect(namedSigners.admin)
          .update(runtimeDefaults, testRoles, false);

        for (const roleDefinition of testRoles) {
          for (const address of roleDefinition.addresses) {
            expect(await contract.hasRole(roleDefinition.role, address)).to.be
              .true;
          }
        }
      });

      it("Should revoke roles assigned during deployment", async () => {
        [contract] = await deployInstance(
          "ERC1155NFTProduct",
          { ...deploymentDefaults, owner: namedSigners.owner.address },
          runtimeDefaults,
          testRoles
        );

        await contract.connect(namedSigners.owner).update(
          runtimeDefaults,
          testRoles.map((def) => ({ ...def, addresses: [] })),
          false
        );

        for (const roleDefinition of testRoles) {
          for (const address of roleDefinition.addresses) {
            expect(await contract.hasRole(roleDefinition.role, address)).to.be
              .false;
          }
        }
      });

      it("Should revoke roles assigned after deployment", async () => {
        await contract
          .connect(namedSigners.admin)
          .update(runtimeDefaults, testRoles, false);

        await contract.connect(namedSigners.admin).update(
          runtimeDefaults,
          testRoles.map((def) => ({ ...def, addresses: [] })),
          false
        );

        for (const roleDefinition of testRoles) {
          for (const address of roleDefinition.addresses) {
            expect(await contract.hasRole(roleDefinition.role, address)).to.be
              .false;
          }
        }
      });

      it("Should freeze roles", async () => {
        await expect(
          contract.connect(namedSigners.admin).update(
            runtimeDefaults,
            [
              {
                role: testRole,
                addresses: [namedSigners.user.address],
                frozen: true,
              },
            ],
            false
          )
        ).not.to.be.reverted;
      });

      it("Should fail if trying to unfreeze a role", async () => {
        await contract.connect(namedSigners.admin).update(
          runtimeDefaults,
          [
            {
              role: testRole,
              addresses: [namedSigners.user.address],
              frozen: true,
            },
          ],
          false
        );

        await expect(
          contract.connect(namedSigners.admin).update(
            runtimeDefaults,
            [
              {
                role: testRole,
                addresses: [namedSigners.user.address],
                frozen: false,
              },
            ],
            false
          )
        ).to.be.revertedWith(`GranularRoles: role ${testRole} is frozen`);
      });

      it("Should fail if trying to change a frozen role", async () => {
        await contract.connect(namedSigners.admin).update(
          runtimeDefaults,
          [
            {
              role: testRole,
              addresses: [namedSigners.user.address],
              frozen: true,
            },
          ],
          false
        );

        await expect(
          contract.connect(namedSigners.admin).update(
            runtimeDefaults,
            [
              {
                role: testRole,
                addresses: [],
                frozen: true,
              },
            ],
            false
          )
        ).to.be.revertedWith(`GranularRoles: role ${testRole} is frozen`);
      });

      it("Should fail when trying to update ADMIN_ROLE", async () => {
        await expect(
          contract.connect(namedSigners.admin).update(
            runtimeDefaults,
            [
              {
                role: ADMIN_ROLE,
                addresses: [namedSigners.user.address],
                frozen: true,
              },
            ],
            false
          )
        ).to.be.revertedWith(`GranularRoles: invalid role ${ADMIN_ROLE}`);
      });
    });

    describe("AccessControl", () => {
      it("Should prevent ADMIN_ROLE from calling grantRole()", async () => {
        await expect(
          contract
            .connect(namedSigners.admin)
            .grantRole(UPDATE_CONTRACT_ROLE, namedSigners.admin.address)
        ).to.be.revertedWith(
          `AccessControl: account ${namedSigners.admin.address.toLowerCase()} is missing role`
        );
      });

      it("Should prevent ADMIN_ROLE from calling revokeRole()", async () => {
        await expect(
          contract
            .connect(namedSigners.admin)
            .revokeRole(ADMIN_ROLE, namedSigners.owner.address)
        ).to.be.revertedWith(
          `AccessControl: account ${namedSigners.admin.address.toLowerCase()} is missing role`
        );
      });
    });
  });
});
