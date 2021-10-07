const {expect} = require("chai");

describe("NFT", function () {
  it("It should deploy the contract, mint a token, and resolve to the right URI", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("NFTPort", "NFT", true);
    const URI = "ipfs://QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    await nft.deployed();
    await nft.mintToCaller("0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42", URI);
    expect(await nft.tokenURI(1)).to.equal(URI)
  });

  it("It should deploy the contract, with correct name and symbol, tokens uri's are initially frozen", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("mock_name", "symbol", false);
    await nft.deployed();
    expect(await nft.name()).to.equal("mock_name");
    expect(await nft.symbol()).to.equal("symbol");
    expect(await nft.globalUpdatableTokenUri()).to.equal(false);
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, trying to update URI should lead to error, freeze individual token should revert", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("NFTPort", "NFT", false);
    const URI = "default";
    const URIUpdated = "updated";
    await nft.deployed();
    await nft.mintToCaller("0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42", URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await expect(nft.updateTokenUri(1, URIUpdated)).to.be.reverted;
    await expect(nft.freezeTokenUri(1)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value, freeze token, trying to update URI should lead to error", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("NFTPort", "NFT", true);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.deployed();
    await nft.mintToCaller("0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42", URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await expect(nft.updateTokenUri(1, URI)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated);
    expect(await nft.tokenURI(1)).to.equal(URIUpdated);
    await nft.freezeTokenUri(1);
    await expect(nft.updateTokenUri(1, URIUpdated2)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("NFTPort", "NFT", true);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.deployed();
    await nft.mintToCaller("0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42", URI);
    expect(await nft.tokenURI(1)).to.equal(URI);
    await nft.updateTokenUri(1, URIUpdated);
    expect(await nft.tokenURI(1)).to.equal(URIUpdated);
    await nft.freezeAllTokenUris();
    await expect(nft.updateTokenUri(1, URIUpdated2)).to.be.reverted;
    await expect(nft.freezeAllTokenUris()).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy("NFTPort", "NFT", true);
    const URI = "default";
    await nft.deployed();
    await expect(nft.updateTokenUri(1, URI)).to.be.reverted;
    await expect(nft.freezeTokenUri(1)).to.be.reverted;
  });

});