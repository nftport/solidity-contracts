const {expect} = require("chai");

const baseURI = "ipfs://";
const baseURIUpdated = "https://someipfs.com/mockhash/";

const deploy = async(metadataUpdatable = true, tokensBurnable = true, tokensTransferable = true, overrideBaseURI = null) => {
  const [owner] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("CustomERC1155");
  const nft = await NFT.deploy(
    "NFTPort",
    "NFT",
    owner.address,
    metadataUpdatable,
    tokensBurnable,
    tokensTransferable,
    overrideBaseURI !== null ? overrideBaseURI : baseURI,
    "");
  await nft.deployed();
  return nft;
}

describe("8_custom_erc1155.sol", function () {

  beforeEach(async () => {
    [owner, caller, receiver] = await ethers.getSigners();
  });

  it("It should deploy the contract, mint a token, and resolve to the right URI, check balanceOf", async () => {
    const nft = await deploy();
    const URI = "QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    expect(await nft.balanceOf(caller.address, 12345)).to.equal(0);
    await nft.mintByOwner(caller.address, 12345, 5, URI);
    expect(await nft.uri(12345)).to.equal(baseURI + URI);
    expect(await nft.balanceOf(caller.address, 12345)).to.equal(5);
  });

  it("It should deploy the contract, with correct name and symbol, options are false", async () => {
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
    await nft.mintByOwner(caller.address, 1, 5, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    expect(await nft.baseURI()).to.equal(baseURI);
    await expect(nft.updateTokenUri(1, URIUpdated, false)).to.be.reverted;
    await expect(nft.updateTokenUri(1, '', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, update baseURI should fail", async () => {
    const nft = await deploy(false);
    const URI = "default";
    await nft.mintByOwner(caller.address, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);    
    await expect(nft.update(baseURIUpdated, false)).to.be.reverted;
  });


  it("It should deploy the contract, tokens uri's are are initially updatable, mint token, update baseURI, check new token URI, empty baseURI is ok too", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    await nft.mintByOwner(caller.address, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await nft.update(baseURIUpdated, true, false);
    expect(await nft.baseURI()).to.equal(baseURIUpdated);
    expect(await nft.uri(1)).to.equal(baseURIUpdated + URI);
    await nft.update('', true, false);
    expect(await nft.uri(1)).to.equal(URI);
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value + freeze token, trying to update URI should lead to error", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintByOwner(caller.address, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await expect(nft.updateTokenUri(1, URI, false)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated, true);
    expect(await nft.uri(1)).to.equal(baseURI + URIUpdated);
    await expect(nft.updateTokenUri(1, URIUpdated2, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintByOwner(caller.address, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.uri(1)).to.equal(baseURI + URIUpdated);
    await nft.update('', true, true);
    await expect(nft.updateTokenUri(1, URIUpdated2, false)).to.be.reverted;
    await expect(nft.update('', true, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const nft = await deploy();
    const URI = "default";
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
  });


  it("It should deploy the contract, mint token, burn it by owner, then trying to update/freeze non-existing token should lead to error, burn is possible once", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintByOwner(owner.address, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await expect(nft.connect(receiver).burn(1, 1)).to.be.reverted;
    await nft.burn(1, 1);
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
    await expect(nft.burn(1, 1)).to.be.reverted;
  });

  it("It should deploy the contract, mint token, burn it, check totalSupply on all stages", async () => {
    const nft = await deploy();
    const URI = "default";
    expect(await nft.totalSupply(1)).to.equal(0);
    await nft.mintByOwner(owner.address, 1, 2, URI);
    expect(await nft.totalSupply(1)).to.equal(2);
    await nft.burn(1, 1);
    expect(await nft.totalSupply(1)).to.equal(1);
  });

  it("It should deploy the contract, tokens are transferable, transfer, then update to non-transferable, transfer should fail", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintByOwner(owner.address, 1, 2, URI);
    expect(await nft.balanceOf(owner.address, 1)).to.equal(2);
    await nft.transferByOwner(receiver.address, 1, 1);
    expect(await nft.balanceOf(receiver.address, 1)).to.equal(1);
    await nft.update('', false, true);
    await expect(nft.transferByOwner(caller.address, 1, 1)).to.be.reverted;
    expect(await nft.balanceOf(caller.address, 1)).to.equal(0);
  });


  it("It should deploy the contract, tokens are transferable, batch transfer, then update to non-transferable, transfer should fail", async () => {
    const nft = await deploy();
    const URI = "default";
    const URI2 = "default2";
    await nft.mintByOwnerBatch([owner.address, caller.address], [1,2], [3,4], [URI, URI2]);
    expect(await nft.balanceOf(owner.address, 1)).to.equal(3);
    expect(await nft.balanceOf(caller.address, 2)).to.equal(4);
    await nft.transferByOwnerBatch([caller.address, receiver.address], [1,1], [1,1]);
    expect(await nft.balanceOf(owner.address, 1)).to.equal(1);
    expect(await nft.balanceOf(caller.address, 1)).to.equal(1);
    expect(await nft.balanceOf(receiver.address, 1)).to.equal(1);
    await nft.update('', false, true);
    await expect(nft.transferByOwnerBatch([receiver.address], [1], [1])).to.be.reverted;
    expect(await nft.balanceOf(receiver.address, 1)).to.equal(1);
  });


  it("It should deploy the contract, mintBatch tokens, batchBurns them (partially), check totalSupply on all stages", async () => {
    const nft = await deploy();
    const URI = "default";
    const URI2 = "default2";
    expect(await nft.totalSupply(1)).to.equal(0);
    await nft.mintByOwnerBatch([owner.address, owner.address], [1,2], [2,3], [URI, URI2]);
    expect(await nft.totalSupply(1)).to.equal(2);
    expect(await nft.totalSupply(2)).to.equal(3);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    expect(await nft.uri(2)).to.equal(baseURI + URI2);
    await nft.burnBatch([1,2], [1,1]);
    expect(await nft.totalSupply(1)).to.equal(1);
    expect(await nft.totalSupply(2)).to.equal(2);
  });

  it("It should deploy the contract, revert mintBatch w/insufficient params", async () => {
    const nft = await deploy();
    const URI = "default";
    const URI2 = "default2";
    await expect(nft.mintByOwnerBatch([caller.address, caller.address], [1,2], [2], [URI, URI2])).to.be.reverted;
    await expect(nft.mintByOwnerBatch([caller.address, caller.address], [1,2], [0,1], [URI, URI2])).to.be.reverted;
    await expect(nft.mintByOwnerBatch([caller.address, caller.address], [1,2], [2], [URI, URI2])).to.be.reverted;
    await expect(nft.mintByOwnerBatch([caller.address], [1,2], [1,2], [URI, URI2])).to.be.reverted;
  });


});