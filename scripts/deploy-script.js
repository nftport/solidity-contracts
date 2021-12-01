const hre = require("hardhat");

async function main() {
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy("NFTPort", "NFT");
  await nft.deployed();
  console.log("NFT deployed to:", nft.address);

  // const ERC1155Tokens = await hre.ethers.getContractFactory("ERC1155NFT");
  // const ERC1155tokens = await ERC1155Tokens.deploy("","Yo Block","YB");
  // await ERC1155tokens.deployed();
  // console.log("ERC1155NFT deployed to:", ERC1155tokens.address);

  // const ERC1155TokensRoles = await hre.ethers.getContractFactory("ERC1155NFTRoles");
  // const ERC1155tokensroles = await ERC1155TokensRoles.deploy("","Yo Block","YB","0xe30624B43A4C53a014b60db658928563a22A650A");
  // await ERC1155tokensroles.deployed();
  // console.log("ERC1155TokensRoles deployed to:", ERC1155tokensroles.address);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
