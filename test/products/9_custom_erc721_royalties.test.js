const {expect} = require("chai");

// const caller = "0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42";
// const receiver.address = "0x7f7631fA2C3E7b78aD8CEA99E08844440c7626f0";
const baseURI = "ipfs://";
const baseURIUpdated = "https://someipfs.com/mockhash/";

const deploy = async(metadataUpdatable = true, tokensBurnable = true, tokensTransferable = true, overrideBaseURI = null) => {
  const [owner] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("CustomERC721Royalties");
  const nft = await NFT.deploy(
    "NFTPort",
    "NFT",
    owner.address,
    metadataUpdatable,
    tokensBurnable,
    tokensTransferable,
    overrideBaseURI !== null ? overrideBaseURI : baseURI,
    owner.address,
    250
  );
  await nft.deployed();
  return nft;
}

describe("9_custom_erc721_royalties.sol", function () {

  beforeEach(async () => {
    [owner, caller, receiver] = await ethers.getSigners();
  });

  it("It should deploy the contract, mint a token, and resolve to the right URI", async () => {
    const nft = await deploy();
    const URI = "QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI)
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
    const URI = "default";
    const URIUpdated = "updated";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    expect(await nft.baseURI()).to.equal(baseURI);
    await expect(nft.updateTokenUri(1, URIUpdated, false)).to.be.reverted;
    await expect(nft.updateTokenUri(1, '', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, update baseURI should fail", async () => {
    const nft = await deploy(false);
    const URI = "default";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);    
    await expect(nft.update(baseURIUpdated, false, true)).to.be.reverted;
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update baseURI, check new token URI, empty baseURI is ok too", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await nft.update(baseURIUpdated, true, false, owner.address, 250);
    expect(await nft.baseURI()).to.equal(baseURIUpdated);
    expect(await nft.tokenURI(1)).to.equal(baseURIUpdated + URI);
    await nft.update('', true, false, owner.address, 250);
    expect(await nft.tokenURI(1)).to.equal(URI);
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value + freeze token, trying to update URI should lead to error", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await expect(nft.updateTokenUri(1, URI, false)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated, true);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated);
    await expect(nft.updateTokenUri(1, URIUpdated2, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URIUpdated);
    await nft.update('', true, true, owner.address, 250);
    await expect(nft.updateTokenUri(1, URIUpdated2, false)).to.be.reverted;
    await expect(nft.update('', true, true, owner.address, 250)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const nft = await deploy(false);
    const URI = "default";
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
  });


  it("It should deploy the contract, mint token, burn it by owner, then trying to update/freeze non-existing token should lead to error, burn is possible once", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintToCaller(owner.address, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(baseURI + URI);
    await expect(nft.connect(receiver).burn(1)).to.be.reverted;
    await nft.burn(1);
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
    await expect(nft.burn(1)).to.be.reverted;
  });

  it("It should deploy the contract, mint token, burn it, check totalSupply on all stages", async () => {
    const nft = await deploy();
    const URI = "default";
    expect(await nft.totalSupply()).to.equal(0);
    await nft.mintToCaller(owner.address, 1, URI);
    expect(await nft.totalSupply()).to.equal(1);
    await nft.burn(1);
    expect(await nft.totalSupply()).to.equal(0);
  });

  it("It should deploy the contract, mint token, then check tokenOfOwnerByIndex / tokenByIndex", async () => {
    const nft = await deploy();
    const URI = "default";
    expect(await nft.totalSupply()).to.equal(0);
    await nft.mintToCaller(owner.address, 12345, URI);
    expect(await nft.tokenOfOwnerByIndex(owner.address, 0)).to.equal(12345);
    expect(await nft.tokenByIndex(0)).to.equal(12345);
    await expect(nft.tokenOfOwnerByIndex(owner.address, 1)).to.be.reverted;
    await expect(nft.tokenByIndex(1)).to.be.reverted;
    await nft.burn(12345);
    await expect(nft.tokenOfOwnerByIndex(owner.address, 0)).to.be.reverted;
    await expect(nft.tokenByIndex(0)).to.be.reverted;
  });


  it("It should deploy the contract, tokens are transferable, transfer, then update to non-transferable, transfer should fail", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintToCaller(owner.address, 1, URI);
    expect(await nft.ownerOf(1)).to.equal(owner.address);
    await nft.transferByOwner(receiver.address, 1);
    expect(await nft.ownerOf(1)).to.equal(receiver.address);
    await nft.update('', false, true, owner.address, 250);
    await nft.mintToCaller(owner.address, 2, URI);
    await expect(nft.transferByOwner(receiver.address, 2)).to.be.reverted;
    expect(await nft.ownerOf(2)).to.equal(owner.address);
  });

  it("Should deploy the contract and return correct ERC2981 royalties info", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintToCaller(owner.address, 1, URI);
    const [royaltiesAddress, royaltiesFee] = await nft.royaltyInfo(1, 10000);
    expect(royaltiesAddress).to.equal(owner.address);
    expect(royaltiesFee).to.equal(250);
  });

  it("Should deploy the contract and return base64-encoded OpenSea royalties info", async () => {
    const nft = await deploy();
    const blob = await nft.contractURI();
    const json = Buffer.from(blob.replace('data:application/json;base64,', ''), 'base64').toString();
    const { seller_fee_basis_points, fee_recipient } = JSON.parse(json);
    expect(fee_recipient).to.equal(owner.address.toLowerCase());
    expect(seller_fee_basis_points).to.equal(250);
  });
});