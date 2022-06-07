const {expect} = require("chai");

const caller = "0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42";

const deploy = async(isFreezeTokenUris = true) => {
  const [owner] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("CustomTokenIdAccessRightsUpdatable");
  const nft = await NFT.deploy("NFTPort", "NFT", owner.address, isFreezeTokenUris);
  await nft.deployed();
  return nft;
}

describe("4_custom_token_id_access_rights_updatable.sol", function () {
  it("It should deploy the contract, mint a token, and resolve to the right URI", async () => {
    const nft = await deploy();
    const URI = "ipfs://QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    await nft.mintToCaller(caller, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(URI)
  });

  it("It should deploy the contract, with correct name and symbol, tokens uri's are initially frozen", async () => {
    const nft = await deploy();
    expect(await nft.name()).to.equal("NFTPort");
    expect(await nft.symbol()).to.equal("NFT");
    expect(await nft.isFreezeTokenUris()).to.equal(true);
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, trying to update URI should lead to error, freeze individual token should revert", async () => {
    const nft = await deploy();
    const URI = "default";
    const URIUpdated = "updated";
    await nft.mintToCaller(caller, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await expect(nft.updateTokenUri(1, URIUpdated, false)).to.be.reverted;
    await expect(nft.updateTokenUri(1, '', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value + freeze token, trying to update URI should lead to error", async () => {
    const nft = await deploy(false);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await expect(nft.updateTokenUri(1, URI, false)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated, true);
    expect(await nft.tokenURI(1)).to.equal(URIUpdated);
    await expect(nft.updateTokenUri(1, URIUpdated2, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const nft = await deploy(false);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller, 1, URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.tokenURI(1)).to.equal(URIUpdated);
    await nft.freezeAllTokenUris();
    await expect(nft.updateTokenUri(1, URIUpdated2, false)).to.be.reverted;
    await expect(nft.freezeAllTokenUris()).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const nft = await deploy(false);
    const URI = "default";
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
  });

});