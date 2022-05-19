const {expect} = require("chai");
const keccak256 = require("keccak256");

const baseURI = "ipfs://";
const baseURIUpdated = "https://someipfs.com/mockhash/";

const URI = "QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";

const roles = {
  ADMIN_ROLE: keccak256("ADMIN_ROLE"),
  MINT_ROLE: keccak256("MINT_ROLE"),
  UPDATE_CONTRACT_ROLE: keccak256("UPDATE_CONTRACT_ROLE"),
  UPDATE_TOKEN_ROLE: keccak256("UPDATE_TOKEN_ROLE"),
  BURN_ROLE: keccak256("BURN_ROLE"),
  TRANSFER_ROLE: keccak256("TRANSFER_ROLE")
}

const deploy = async(
  metadataUpdatable = true,
  tokensBurnable = true,
  tokensTransferable = true,
  overrideBaseURI = null,
  overrideRolesAddresses = null
) => {
    [
      caller,
      receiver,
      admin_role,
      mint_role,
      mint2_role,
      update_contract_role,
      update_token_role,
      burn_role,
      transfer_role,
      thirdparty
    ] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("ERC721NFTCustom");
  const deploymentConfig = {
    name: "NFTPort",
    symbol: "NFT",
    owner: admin_role.address,
    tokensBurnable
  }
  
  const runtimeConfig = {
    baseURI: overrideBaseURI !== null ? overrideBaseURI : baseURI,
    metadataUpdatable,
    tokensTransferable,
    royaltiesBps: 250,
    royaltiesAddress: admin_role.address
  }

  const defaultRolesAddresses = [
    {
      role: roles.MINT_ROLE,
      addresses: [mint_role.address, mint2_role.address],
      frozen: false
    },
    {
      role: roles.UPDATE_CONTRACT_ROLE,
      addresses: [update_contract_role.address],
      frozen: false
    },
    {
      role: roles.UPDATE_TOKEN_ROLE,
      addresses: [update_token_role.address],
      frozen: false
    },
    {
      role: roles.BURN_ROLE,
      addresses: [burn_role.address],
      frozen: false
    },
    {
      role: roles.TRANSFER_ROLE,
      addresses: [transfer_role.address],
      frozen: true
    }
  ]
  rolesAddresses = overrideRolesAddresses ? overrideRolesAddresses : defaultRolesAddresses;

  const nft = await NFT.deploy(
    deploymentConfig,
    runtimeConfig,
    rolesAddresses
  );
  await nft.deployed();
  return nft;
}

describe("ERC721NFTCustom", function () {

  beforeEach(async () => {
    [
      caller,
      receiver,
      admin_role,
      mint_role,
      update_contract_role,
      update_token_role,
      burn_role,
      transfer_role
    ] = await ethers.getSigners();
  });

  it("It should check deployment various roles cases", async () => {
    // empty roles
    await deploy(true, true, true, null, []);
    // wrong role
    await expect(deploy(true, true, true, null, [
      {
        role: 123123,
        addresses: [mint_role.address, mint2_role.address],
        frozen: false
      },
    ])).to.be.reverted;
    // role w/no address; then same w/address - wrong input, but should be processed correctly, 
    // as freeze applies after initialization
    await deploy(true, true, true, null, [
      {
        role: roles.MINT_ROLE,
        addresses: [],
        frozen: true
      },
      {
        role: roles.MINT_ROLE,
        addresses: [mint_role.address, mint2_role.address],
        frozen: true
      },
    ]);
  });

  it("It should deploy, then update one of roles w/different cases", async () => {
    const nft = await deploy();
    const newConfig = {
      owner: admin_role.address,
      baseURI: "baseUri",
      metadataUpdatable: true,
      tokensTransferable: true,
      royaltiesBps: 250,
      royaltiesAddress: admin_role.address
    }; 
    // wrong role
    await expect(nft.update(newConfig, [
      {
        role: 123123,
        addresses: [mint_role.address, mint2_role.address],
        frozen: false
      },
    ], false)).to.be.reverted;
    // update_contract_role cannot change permissions
    await expect(nft.connect(update_contract_role).update(newConfig, [
      {
        role: roles.BURN_ROLE,
        addresses: [mint_role.address, mint2_role.address],
        frozen: false
      },
    ], false)).to.be.reverted;
    expect(await nft.hasRole(roles.BURN_ROLE, burn_role.address)).to.equal(true);
    // no roles; freeze
    await nft.update(newConfig, [
      {
        role: roles.BURN_ROLE,
        addresses: [],
        frozen: false
      },
    ], false);
    expect(await nft.hasRole(roles.BURN_ROLE, burn_role.address)).to.equal(false);
    await nft.update(newConfig, [
      {
        role: roles.BURN_ROLE,
        addresses: [burn_role.address, mint_role.address, mint2_role.address],
        frozen: true
      },
    ], false);
    expect(await nft.hasRole(roles.BURN_ROLE, burn_role.address)).to.equal(true);
    expect(await nft.hasRole(roles.BURN_ROLE, mint_role.address)).to.equal(true);
    expect(await nft.hasRole(roles.BURN_ROLE, mint2_role.address)).to.equal(true);
    // try to update frozen role
    await expect(nft.update(newConfig, [
      {
        role: roles.BURN_ROLE,
        addresses: [burn_role.address],
        frozen: false
      },
    ], false)).to.be.reverted;
  });

  it("It should deploy the contract, mint a token, and resolve to the right URI, mint from wrong roles should fail", async () => {
    const nft = await deploy();
    
    await nft.mintToCaller(caller.address, 1, URI);
    await nft.connect(admin_role).mintToCaller(caller.address, 2, URI);
    await nft.connect(mint_role).mintToCaller(caller.address, 3, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI)
    expect(await nft.tokenURI(2)).to.equal(baseURI + URI)
    expect(await nft.tokenURI(3)).to.equal(baseURI + URI)
    await expect(nft.connect(update_contract_role).mintToCaller(caller.address, 1, URI)).to.be.reverted;
    await expect(nft.connect(update_token_role).mintToCaller(caller.address, 1, URI)).to.be.reverted;
    await expect(nft.connect(burn_role).mintToCaller(caller.address, 1, URI)).to.be.reverted;
    await expect(nft.connect(transfer_role).mintToCaller(caller.address, 1, URI)).to.be.reverted;
    await expect(nft.connect(thirdparty).mintToCaller(caller.address, 1, URI)).to.be.reverted;
  });

  it("It should deploy the contract, revoke NFTPort permission, then mint a token from NFTPort should fail", async () => {
    const nft = await deploy();
    await nft.mintToCaller(caller.address, 1, URI);
    await nft.revokeNFTPortPermissions();
    await expect(nft.mintToCaller(caller.address, 1, URI)).to.be.reverted;
  });
  
  it("It should deploy the contract, check transferOwnership", async () => {
    const nft = await deploy();
    expect(await nft.owner()).to.equal(admin_role.address); 
    await expect(nft.transferOwnership(thirdparty.address)).to.be.reverted;
    await nft.connect(admin_role).transferOwnership(thirdparty.address);
    expect(await nft.owner()).to.equal(thirdparty.address); 
    await nft.connect(thirdparty).mintToCaller(caller.address, 2, URI);
    await expect(nft.connect(admin_role).mintToCaller(caller.address, 2, URI)).to.be.reverted;
  });
  
  it("It should deploy the contract, with correct name and symbol, all options are false", async () => {
    const nft = await deploy(false, false, false);
    expect(await nft.name()).to.equal("NFTPort");
    expect(await nft.symbol()).to.equal("NFT");
    expect(await nft.metadataUpdatable()).to.equal(false);
    expect(await nft.tokensBurnable()).to.equal(false);
    expect(await nft.tokensTransferable()).to.equal(false);
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, trying to update URI should lead to error, freeze individual token should revert", async () => {
    const nft = await deploy(false);
    const URIUpdated = "updated";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    expect(await nft.baseURI()).to.equal(baseURI);
    await expect(nft.updateTokenUri(1, URIUpdated, false)).to.be.reverted;
    await expect(nft.updateTokenUri(1, '', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, update baseURI should fail", async () => {
    const nft = await deploy(false);
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);    
    await expect(nft.update({
        owner: admin_role.address,
        baseURI: baseURIUpdated,
        metadataUpdatable: false,
        tokensTransferable: true,
        royaltiesBps: 250,
        royaltiesAddress: admin_role.address
    }, [], false)).to.be.reverted;
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update baseURI, check new token URI, empty baseURI is ok too; try different roles", async () => {
    const nft = await deploy();
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    const updateInput = {
      owner: admin_role.address,
      baseURI: baseURIUpdated,
      metadataUpdatable: true,
      tokensTransferable: false,
      royaltiesBps: 250,
      royaltiesAddress: admin_role.address
    }
    await nft.update(updateInput, [], false);
    expect(await nft.baseURI()).to.equal(baseURIUpdated);
    expect(await nft.tokenURI(1)).to.equal(baseURIUpdated + URI);
    await nft.connect(admin_role).update(updateInput, [], false);
    await nft.connect(update_contract_role).update(updateInput, [], false);
    await expect(nft.connect(mint_role).update(updateInput, [], false)).to.be.reverted;
    await expect(nft.connect(update_token_role).update(updateInput, [], false)).to.be.reverted;
    await expect(nft.connect(burn_role).update(updateInput, [], false)).to.be.reverted;
    await expect(nft.connect(transfer_role).update(updateInput, [], false)).to.be.reverted;
    await expect(nft.connect(thirdparty).update(updateInput, [], false)).to.be.reverted;
    await nft.update({...updateInput, baseURI: ""}, [], false);
    expect(await nft.tokenURI(1)).to.equal(URI);
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value + freeze token, trying to update URI should lead to error, check roles", async () => {
    const nft = await deploy();
    const URIUpdated = "updated";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await expect(nft.updateTokenUri(1, URI, false)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated);

    await nft.connect(admin_role).updateTokenUri(1, URIUpdated + 2, false);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated + 2);

    await nft.connect(update_token_role).updateTokenUri(1, URIUpdated + 3, false);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated + 3);

    await expect(nft.connect(mint_role).updateTokenUri(1, URIUpdated + 4, false)).to.be.reverted;
    await expect(nft.connect(update_contract_role).updateTokenUri(1, URIUpdated + 4, false)).to.be.reverted;
    await expect(nft.connect(burn_role).updateTokenUri(1, URIUpdated + 4, false)).to.be.reverted;
    await expect(nft.connect(transfer_role).updateTokenUri(1, URIUpdated + 4, false)).to.be.reverted;
    await expect(nft.connect(thirdparty).updateTokenUri(1, URIUpdated + 4, false)).to.be.reverted;

    await nft.updateTokenUri(1, URIUpdated+100, true);
    await expect(nft.updateTokenUri(1, URIUpdated+101, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const nft = await deploy();
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated);
    await nft.update({
      owner: admin_role.address,
      baseURI: "",
      metadataUpdatable: false,
      tokensTransferable: true,
      royaltiesBps: 250,
      royaltiesAddress: admin_role.address
    }, [], false);
    await expect(nft.updateTokenUri(1, URIUpdated2, false)).to.be.reverted;
    await expect(nft.update({
      owner: admin_role.address,
      baseURI: "",
      metadataUpdatable: false,
      tokensTransferable: true,
      royaltiesBps: 250,
      royaltiesAddress: admin_role.address
    }, [], false)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const nft = await deploy(false);
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
  });


  it("It should deploy the contract, mint token, burn it by owner, then trying to update/freeze non-existing token should lead to error, burn is possible once, check roles", async () => {
    const nft = await deploy();
    expect(await nft.totalSupply()).to.equal(0);
    await nft.mintToCaller(admin_role.address, 1, URI);
    await nft.mintToCaller(admin_role.address, 2, URI);
    await nft.mintToCaller(admin_role.address, 3, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await expect(nft.connect(receiver).burn(1)).to.be.reverted;
    expect(await nft.totalSupply()).to.equal(3);

    await expect(nft.connect(mint_role).burn(1)).to.be.reverted;
    await expect(nft.connect(update_token_role).burn(1)).to.be.reverted;
    await expect(nft.connect(update_contract_role).burn(1)).to.be.reverted;
    await expect(nft.connect(transfer_role).burn(1)).to.be.reverted;
    await expect(nft.connect(thirdparty).burn(1)).to.be.reverted;

    await nft.burn(1);
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
    await expect(nft.burn(1)).to.be.reverted;
    await nft.connect(admin_role).burn(2);
    await expect(nft.updateTokenUri(2, URI, true)).to.be.reverted;
    await nft.connect(burn_role).burn(3);
    await expect(nft.updateTokenUri(3, URI, true)).to.be.reverted;
    expect(await nft.totalSupply()).to.equal(0);
  });

  it("It should deploy the contract, mint token, then check tokenOfOwnerByIndex / tokenByIndex", async () => {
    const nft = await deploy();
    expect(await nft.totalSupply()).to.equal(0);
    await nft.mintToCaller(admin_role.address, 12345, URI);
    expect(await nft.tokenOfOwnerByIndex(admin_role.address, 0)).to.equal(12345);
    expect(await nft.tokenByIndex(0)).to.equal(12345);
    await expect(nft.tokenOfOwnerByIndex(admin_role.address, 1)).to.be.reverted;
    await expect(nft.tokenByIndex(1)).to.be.reverted;
    await nft.burn(12345);
    await expect(nft.tokenOfOwnerByIndex(admin_role.address, 0)).to.be.reverted;
    await expect(nft.tokenByIndex(0)).to.be.reverted;
  });


  it("It should deploy the contract, tokens are transferable, transfer, then update to non-transferable, transfer should fail, check roles", async () => {
    const nft = await deploy();
    await nft.mintToCaller(admin_role.address, 1, URI);
    await nft.mintToCaller(admin_role.address, 2, URI);
    await nft.mintToCaller(admin_role.address, 3, URI);
    expect(await nft.ownerOf(1)).to.equal(admin_role.address);

    await expect(nft.connect(mint_role).transferByOwner(receiver.address, 1)).to.be.reverted;
    await expect(nft.connect(update_token_role).transferByOwner(receiver.address, 1)).to.be.reverted;
    await expect(nft.connect(update_contract_role).transferByOwner(receiver.address, 1)).to.be.reverted;
    await expect(nft.connect(burn_role).transferByOwner(receiver.address, 1)).to.be.reverted;
    await expect(nft.connect(thirdparty).transferByOwner(receiver.address, 1)).to.be.reverted;

    await nft.transferByOwner(receiver.address, 1);
    await nft.connect(admin_role).transferByOwner(receiver.address, 2);
    await nft.connect(transfer_role).transferByOwner(receiver.address, 3);

    expect(await nft.ownerOf(1)).to.equal(receiver.address);
    expect(await nft.ownerOf(2)).to.equal(receiver.address);
    expect(await nft.ownerOf(3)).to.equal(receiver.address);

    await nft.update({
      owner: admin_role.address,
      baseURI: "",
      metadataUpdatable: true,
      tokensTransferable: false,
      royaltiesBps: 250,
      royaltiesAddress: admin_role.address
    }, [], false);
    await nft.mintToCaller(admin_role.address, 4, URI);
    await expect(nft.transferByOwner(receiver.address, 4)).to.be.reverted;
    expect(await nft.ownerOf(4)).to.equal(admin_role.address);
  });

  it("Should deploy the contract and return correct ERC2981 royalties info", async () => {
    const nft = await deploy();
    await nft.mintToCaller(admin_role.address, 1, URI);
    const [royaltiesAddress, royaltiesFee] = await nft.royaltyInfo(1, 10000);
    expect(royaltiesAddress).to.equal(admin_role.address);
    expect(royaltiesFee).to.equal(250);
  });

  it("Should deploy the contract and return base64-encoded OpenSea royalties info", async () => {
    const nft = await deploy();
    const blob = await nft.contractURI();
    const json = Buffer.from(blob.replace('data:application/json;base64,', ''), 'base64').toString();
    const { seller_fee_basis_points, fee_recipient } = JSON.parse(json);
    expect(fee_recipient).to.equal(admin_role.address.toLowerCase());
    expect(seller_fee_basis_points).to.equal(250);
  });
});