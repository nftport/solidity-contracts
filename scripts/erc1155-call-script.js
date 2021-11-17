const ERC1155TokensContractaddress = "0x1fa06C8fE27F416E0D6d46d1841Da657CE8efC81";
const Account2 = "0x395a4D90b0F7c34922D09e2652cFCa7362e3a3B4";
async function example_interactions() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("ERC1155NFT");
  const token = await Token.attach(ERC1155TokensContractaddress);
  console.log(await token.functions, deployer.address);

  tokenName = await token.functions.name();
  console.log(`Tokenname : ${tokenName}`);
  tokenSymbol = await token.functions.symbol();
  console.log(`TokenSymbol : ${tokenSymbol}`);

  await token.functions.mint(deployer.address, 0, 1000, "0x00","https://www.birthblock.art/api/v1/metadata/1");
  await token.functions.mint(deployer.address, 1, 3000, "0x00","https://www.birthblock.art/api/v1/metadata/2");
  await token.functions.mint(Account2, 1, 1000, "0x00","https://www.birthblock.art/api/v1/metadata/2");

  balance = await token.functions.balanceOf(deployer.address, 0);
  console.log(`Balance after minting: ${balance[0].toNumber()}`);

  await token.functions.safeTransferFrom(deployer.address, Account2, 0, 10, "0x00");
  balance = await token.functions.balanceOf(deployer.address, 0);

  console.log(`Sender's balance after transfer: ${balance[0].toNumber()}`);
  balance = await token.functions.balanceOf(Account2, 0);
  console.log(`Receiver's balance after transfer: ${balance[0].toNumber()}`);

  await token.functions.safeTransferFrom(deployer.address, Account2, 0, 10, "0x00");
  await token.functions.safeBatchTransferFrom(deployer.address, Account2, [0, 1], [10, 10], "0x00");

  balance = await token.functions.balanceOf(deployer.address, 0);
  console.log(`Sender's token1 balance: ${balance[0].toNumber()}`);
  balance = await token.functions.balanceOf(deployer.address, 1);
  console.log(`Sender's token2 balance: ${balance[0].toNumber()}`);

  balance = await token.functions.balanceOf(Account2, 0);
  console.log(`Receiver's token1 balance: ${balance[0].toNumber()}`);
  balance = await token.functions.balanceOf(Account2, 1);
  console.log(`Receiver's token2 balance: ${balance[0].toNumber()}`);
  console.log(`URI`);
  console.log(await token.functions.uri(0), await token.functions.uri(1));

  const token1tokenSupply = await token.functions.tokenSupply(0);
  const token2tokenSupply = await token.functions.tokenSupply(1);
  console.log(`Token1 tokenSupply: ${token1tokenSupply[0].toNumber()}`);
  console.log(`Token2 tokenSupply: ${token2tokenSupply[0].toNumber()}`);
}

example_interactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
