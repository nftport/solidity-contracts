const ERC1155TokensContractaddress = "0x164599E797d9f7dc3B43570fb123a7F2C629d7D2";

async function example_interactions() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("ERC1155NFTRoles");
  const token = await Token.attach(ERC1155TokensContractaddress);
  console.log(await token.functions, deployer.address);

  console.log(await token.owner());

  await token.functions.mint(deployer.address, 0, 1000, "0x00","https://www.birthblock.art/api/v1/metadata/1");

}

example_interactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
