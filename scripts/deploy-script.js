const hre = require("hardhat");

async function main() {
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy("NFTPort", "NFT");
  await nft.deployed();
  console.log("NFT deployed to:", nft.address);

  const ERC1155Tokens = await hre.ethers.getContractFactory("ERC1155NFT");
  const ERC1155tokens = await ERC1155Tokens.deploy("","Yo Block","YB");
  await ERC1155tokens.deployed();
  console.log("ERC1155NFT deployed to:", ERC1155tokens.address);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
