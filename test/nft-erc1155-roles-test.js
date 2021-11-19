const {expect} = require("chai");
const METADATA_URI = "https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg";

const deploy = async() => {
  const [deployer, address1, contractOwner, address2] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("ERC1155NFTRoles");
  const nft = await NFT.deploy(METADATA_URI,"Yoo Token", "YT",contractOwner.address);
  await nft.deployed();
  return nft;
}

describe("ERC1155NFT Roles", function() {
  it("It should deploy the contract, validate contract owner", async () => {
    const nft = await deploy();
    const [deployer, address1, contractOwner, address2] = await ethers.getSigners();
    await expect(await nft.owner()).to.equal(contractOwner.address);
  });
  it("It should deploy the contract, mint token for deployer & Owner, should lead to error while minting tokens from not access control accounts: address1,address2", async () => {
    const nft = await deploy();
    const [deployer, address1, contractOwner, address2] = await ethers.getSigners();
    await nft.connect(deployer).functions.mint(address1.address, 1, 2000, "0x00",METADATA_URI);
    await nft.connect(contractOwner).functions.mint(address1.address, 1, 2000, "0x00",METADATA_URI);
    await expect(nft.connect(address1).functions.mint(address1.address, 1, 2000, "0x00",METADATA_URI)).to.be.reverted;
    await expect(nft.connect(address2).functions.mint(address1.address, 1, 2000, "0x00",METADATA_URI)).to.be.reverted;
  });
});
