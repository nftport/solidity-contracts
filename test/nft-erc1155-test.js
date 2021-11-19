const {expect} = require("chai");


const NON_EXISTENT_TOKEN_ID = 99999999;
const INITIAL_TOKEN_ID = 1;
const MINT_AMOUNT = 1;

const deploy = async() => {
  const [deployer] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("ERC1155NFT");
  const nft = await NFT.deploy("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg","Yoo Token", "YT");
  await nft.deployed();
  return nft;
}

describe("ERC1155NFT", function() {
  it("It should deploy the contract, set metadata uri validate token name,symbol,uri", async () => {
    const nft = await deploy();
    await nft.functions.setURI("https://www.birthblock.art/api/v1/metadata/1")
    var UriArray = await nft.functions.uri(0);
    var uriValues = UriArray.values();
    expect(await nft.name()).to.equal("Yoo Token");
    expect(await nft.symbol()).to.equal("YT");
    expect(await uriValues.next().value).to.equal("https://www.birthblock.art/api/v1/metadata/1")
  });

  it("It should deploy the contract, Mint tokens, Check token balance", async () => {
    const nft = await deploy();
    const [deployer] = await ethers.getSigners();
    const mintToken0 = await nft.functions.mint(deployer.address, 0, 1000, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    const mintToken1 = await nft.functions.mint(deployer.address, 1, 2000, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    balancetoken0 = await nft.functions.balanceOf(deployer.address, 0);
    balancetoken1 = await nft.functions.balanceOf(deployer.address, 1);
    await expect(balancetoken0[0].toNumber()).to.equal(1000);
    await expect(balancetoken1[0].toNumber()).to.equal(2000);
  });

  it("It should deploy the contract, its trying call setURI function without passing argument should lead to error, mint token with uri, mint token with empty uri, validate token 0 uri, validate token 1 uri", async () => {
    const nft = await deploy();
    const [deployer] = await ethers.getSigners();
    await expect(nft.setURI()).to.be.reverted;
    const mintToken0 = await nft.functions.mint(deployer.address, 0, 1000, "0x00","TestingURI");
    const mintToken1 = await nft.functions.mint(deployer.address, 1, 1000, "0x00","");
    await expect(await nft.uri(0)).to.equal("TestingURI");
    await expect(await nft.uri(1)).to.equal("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
  });

  it('It should deploy the contract, return zero for non-existent token', async () => {
    const nft = await deploy();
    const [deployer] = await ethers.getSigners();
    const balanceValue = await nft.balanceOf(deployer.address,NON_EXISTENT_TOKEN_ID);
    await expect(balanceValue).to.equal(0);
    const supplyAccessorValue = await nft.totalSupply(NON_EXISTENT_TOKEN_ID);
    await expect(supplyAccessorValue).to.equal(0);
  });

  it('It should deploy the contract, should update token totalSupply after minting', async () => {
    const nft = await deploy();
    const [deployer] = await ethers.getSigners();
    let supply = await nft.totalSupply(INITIAL_TOKEN_ID);
    await expect(supply).to.equal(0);
    await nft.functions.mint(deployer.address, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    supply = await nft.totalSupply(INITIAL_TOKEN_ID);
    await expect(supply).to.equal(MINT_AMOUNT);
  });




});
