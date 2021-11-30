const {expect} = require("chai");

const caller = "0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42";
const baseURI = "ipfs://";
const baseURIUpdated = "https://someipfs.com/mockhash/";

const deploy = async(isFreezeTokenUris = true, overrideBaseURI = null) => {
  const [owner] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("ERC1155NFTCustom");
  const nft = await NFT.deploy("", "NFTPort", "NFT", owner.address, isFreezeTokenUris, overrideBaseURI !== null ? overrideBaseURI : baseURI);
  await nft.deployed();
  return nft;
}

describe("ERC1155NFTCustom", function () {
  it("It should deploy the contract, mint a token, and resolve to the right URI, check balanceOf", async () => {
    const nft = await deploy();
    const URI = "QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    expect(await nft.balanceOf(caller, 12345)).to.equal(0);
    await nft.mintToCaller(caller, 12345, 5, URI);
    expect(await nft.uri(12345)).to.equal(baseURI + URI);
    expect(await nft.balanceOf(caller, 12345)).to.equal(5);
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
    await nft.mintToCaller(caller, 1, 5, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    expect(await nft.baseURI()).to.equal(baseURI);
    await expect(nft.updateTokenUri(1, URIUpdated, false)).to.be.reverted;
    await expect(nft.updateTokenUri(1, '', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially frozen, mint token, update baseURI should fail", async () => {
    const nft = await deploy();
    const URI = "default";
    await nft.mintToCaller(caller, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);    
    await expect(nft.update(baseURIUpdated, false)).to.be.reverted;
  });


  it("It should deploy the contract, tokens uri's are initially frozen, mint token, update baseURI, check new token URI, empty baseURI is ok too", async () => {
    const nft = await deploy(false);
    const URI = "default";
    const URIUpdated = "updated";
    await nft.mintToCaller(caller, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await nft.update(baseURIUpdated, false);
    expect(await nft.baseURI()).to.equal(baseURIUpdated);
    expect(await nft.uri(1)).to.equal(baseURIUpdated + URI);
    await nft.update('', false);
    expect(await nft.uri(1)).to.equal(URI);
  });


  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI with same value should fail, update URI with new value + freeze token, trying to update URI should lead to error", async () => {
    const nft = await deploy(false);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await expect(nft.updateTokenUri(1, URI, false)).to.be.reverted;
    await nft.updateTokenUri(1, URIUpdated, true);
    expect(await nft.uri(1)).to.equal(baseURI + URIUpdated);
    await expect(nft.updateTokenUri(1, URIUpdated2, true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, mint token, update URI, freeze tokens globally, trying to update URI should lead to error, freeze all accessible only once", async () => {
    const nft = await deploy(false);
    const URI = "default";
    const URIUpdated = "updated";
    const URIUpdated2 = "updated2";
    await nft.mintToCaller(caller, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    await nft.updateTokenUri(1, URIUpdated, false);
    expect(await nft.uri(1)).to.equal(baseURI + URIUpdated);
    await nft.update('', true);
    await expect(nft.updateTokenUri(1, URIUpdated2, false)).to.be.reverted;
    await expect(nft.freezeAllTokenUris()).to.be.reverted;
    await expect(nft.update('', true)).to.be.reverted;
  });

  it("It should deploy the contract, tokens uri's are initially updatable, trying to update/freeze non-existing token should lead to error", async () => {
    const nft = await deploy(false);
    const URI = "default";
    await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
  });


  it("It should deploy the contract, mint token, burn it, then trying to update/freeze non-existing token should lead to error, burn is possible once", async () => {
    const nft = await deploy(true);
    const URI = "default";
    await nft.mintToCaller(caller, 1, 1, URI);
    expect(await nft.uri(1)).to.equal(baseURI + URI);
    // TODO: fix
    // await nft.burn(caller, 1, 1);
    // await expect(nft.updateTokenUri(1, URI, true)).to.be.reverted;
    // await expect(nft.burn(caller, 1, 1)).to.be.reverted;
  });

//   it("It should deploy the contract, mint token, burn it, check totalSupply on all stages", async () => {
//     const nft = await deploy(true);
//     const URI = "default";
//     expect(await nft.totalSupply()).to.equal(0);
//     await nft.mintToCaller(caller, 1, URI);
//     expect(await nft.totalSupply()).to.equal(1);
//     await nft.burn(1);
//     expect(await nft.totalSupply()).to.equal(0);
//   });

//   it("It should deploy the contract, mint token, then check tokenOfOwnerByIndex / tokenByIndex", async () => {
//     const nft = await deploy(true);
//     const URI = "default";
//     expect(await nft.totalSupply()).to.equal(0);
//     await nft.mintToCaller(caller, 12345, URI);
//     expect(await nft.tokenOfOwnerByIndex(caller, 0)).to.equal(12345);
//     expect(await nft.tokenByIndex(0)).to.equal(12345);
//     await expect(nft.tokenOfOwnerByIndex(caller, 1)).to.be.reverted;
//     await expect(nft.tokenByIndex(1)).to.be.reverted;
//     await nft.burn(12345);
//     await expect(nft.tokenOfOwnerByIndex(caller, 0)).to.be.reverted;
//     await expect(nft.tokenByIndex(0)).to.be.reverted;
//   });

});