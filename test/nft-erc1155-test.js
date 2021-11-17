const {
  expect
} = require("chai");

describe("ERC1155NFT", function() {
  it("It should deploy the contract, Set Metadata Uri and Validate it", async () => {
    const NFT = await ethers.getContractFactory("ERC1155NFT");
    const nft = await NFT.deploy("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg","Yoo Token", "YT");
    await nft.deployed();
    await nft.functions.setURI("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg")
    var UriArray = await nft.functions.uri(0);
    var uriValues = UriArray.values();
    expect(await uriValues.next().value).to.equal("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg")
  });

  it("It should deploy the contract, Mint tokens & Check token balance", async () => {
    const [deployer] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("ERC1155NFT");
    const nft = await NFT.deploy("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg","Yoo Token", "YT");
    const token1mint = await nft.functions.mint(deployer.address, 0, 110, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    const token2mint = await nft.functions.mint(deployer.address, 1, 100, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    balancetoken0 = await nft.functions.balanceOf(deployer.address, 0);
    balancetoken1 = await nft.functions.balanceOf(deployer.address, 1);
    await expect(balancetoken0[0].toNumber()).to.equal(110);
    await expect(balancetoken1[0].toNumber()).to.equal(100);
  });

  it("It should deploy the contract, Batch Mint tokens & Check Owner of tokens", async () => {
    const [deployer] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("ERC1155NFT");
    const nft = await NFT.deploy("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg","Yoo Token", "YT");
    await nft.deployed();
    const mint = await nft.functions.mint(deployer.address, 0, 110, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    const token1Owners = await nft.functions.ownersCorrespondingToToken(0);
    await expect(deployer.address).to.equal(token1Owners[0][0]);
  });

  it("It should deploy the contract, Mint tokens & Check token balance", async () => {
    const [deployer] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("ERC1155NFT");
    const nft = await NFT.deploy("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg","Yoo Token", "YT");
    const mintToken0 = await nft.functions.mint(deployer.address, 0, 1000, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    const mintToken1 = await nft.functions.mint(deployer.address, 1, 2000, "0x00","https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
    balancetoken0 = await nft.functions.balanceOf(deployer.address, 0);
    balancetoken1 = await nft.functions.balanceOf(deployer.address, 1);
    await expect(balancetoken0[0].toNumber()).to.equal(1000);
    await expect(balancetoken1[0].toNumber()).to.equal(2000);
  });
});
