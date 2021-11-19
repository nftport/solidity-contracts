const ERC1155TokensContractaddress = "0x164599E797d9f7dc3B43570fb123a7F2C629d7D2";

async function example_interactions() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("ERC1155NFTRoles");
  const token = await Token.attach(ERC1155TokensContractaddress);

  console.log(`Contract Deployer : ${deployer.address}`);
  console.log(`Contract Owner : ${await token.owner()}`);

}

example_interactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
