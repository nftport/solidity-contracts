const {expect} = require("chai");

const caller = "0x5FDd0881Ef284D6fBB2Ed97b01cb13d707f91e42";

const deploy = async() => {
  const NFT = await ethers.getContractFactory("ERC1155NFT");
  const nft = await NFT.deploy("", "NFTPort", "NFT");
  await nft.deployed();
  return nft;
}

describe("ERC1155NFT", function () {
  it("It should deploy the contract, mint a token, and resolve to the right URI, check balanceOf", async () => {
    const nft = await deploy();
    const URI = "QmWJBNeQAm9Rh4YaW8GFRnSgwa4dN889VKm9poc2DQPBkv";
    expect(await nft.balanceOf(caller, 12345)).to.equal(0);
    await nft.mintToCaller(caller, 12345, 5, URI);
    expect(await nft.uri(12345)).to.equal(URI);
    expect(await nft.balanceOf(caller, 12345)).to.equal(5);
  });

  it("It should deploy the contract, mintBatch tokens, check totalSupply on all stages", async () => {
    const nft = await deploy(true);
    const URI = "default";
    const URI2 = "default2";
    expect(await nft.totalSupply(1)).to.equal(0);
    await nft.mintToCallerBatch(caller, [1,2], [2,3], [URI, URI2]);
    expect(await nft.totalSupply(1)).to.equal(2);
    expect(await nft.totalSupply(2)).to.equal(3);
    expect(await nft.uri(1)).to.equal(URI);
    expect(await nft.uri(2)).to.equal(URI2);
  });

  it("It should deploy the contract, revert mintBatch w/insufficient params", async () => {
    const nft = await deploy(true);
    const URI = "default";
    const URI2 = "default2";
    await expect(nft.mintToCallerBatch(caller, [1,2], [2], [URI, URI2])).to.be.reverted;
    await expect(nft.mintToCallerBatch(caller, [1,2], [0,1], [URI, URI2])).to.be.reverted;
    await expect(nft.mintToCallerBatch(caller, [1,2], [2], [URI, URI2])).to.be.reverted;
  });


});