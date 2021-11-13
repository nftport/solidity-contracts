const ERC1155TokensContractaddress = "0x4179DAA9Cf45500FFB75fe720DF043fAbde48D19";
const Account2 = "0x395a4D90b0F7c34922D09e2652cFCa7362e3a3B4";
async function fetch() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("ERC1155NFT");
  const token = await Token.attach(ERC1155TokensContractaddress);
  console.log(await token.functions, deployer.address);

  await token.functions.setURI("https://gateway.pinata.cloud/ipfs/QmeaLZ5Gubd7CSgETvESGuYQWfHmBV4RC28Pu1Veyw4iSg");
  console.log(await token.functions.uri(0));

  await token.functions.mint(deployer.address, 0, 1000, "0x00");
  await token.functions.mint(deployer.address, 0, 1000, "0x00");
  await token.functions.mint(deployer.address, 1, 1000, "0x00");
  await token.functions.mint(Account2, 1, 1000, "0x00");

  balance = await token.functions.balanceOf(deployer.address, 0);
  console.log(`Balance after minting: ${balance[0].toNumber()}`);

  await token.functions.safeTransferFrom(deployer.address, Account2, 0, 10, "0x00");
  balance = await token.functions.balanceOf(deployer.address, 0);
  console.log(`Balance after transfer`);
  console.log(`Sender: ${balance[0].toNumber()}`);
  balance = await token.functions.balanceOf(Account2, 0);
  console.log(`Receiver: ${balance[0].toNumber()}`);

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
  console.log(await token.functions.uri(0), await token.functions.uri(1));

  const token1Balance = await token.functions.tokenBalance(0);
  const token2Balance = await token.functions.tokenBalance(1);
  console.log(`Token1 balance: ${token1Balance[0].toNumber()}`);
  console.log(`Token2 balance: ${token2Balance[0].toNumber()}`);

  const token1Owners = await token.functions.ownersCorrespondingToToken(0);
  const token2Owners = await token.functions.ownersCorrespondingToToken(1);
  console.log(token1Owners);
  console.log(token2Owners);

  const mintBatch = await token.functions.mintBatch(deployer.address, [2, 3], [10, 10], "0x00");
  balance = await token.functions.balanceOf(deployer.address, 2);
  console.log(`Balance after minting: ${balance[0].toNumber()}`);
  balance = await token.functions.balanceOf(deployer.address, 3);
  console.log(`Balance after minting: ${balance[0].toNumber()}`);

}

fetch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
