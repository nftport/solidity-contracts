/**
 * Helper script for generating data for queuing a transaction in Gnosis
 */

const chalk = require("chalk");
const { ethers } = require("hardhat");

async function generateTx(contractName, method, args) {
  const contract = await ethers.getContract(contractName);
  const tx = await contract.populateTransaction[method](...args);

  console.log(
    `\n${chalk.yellowBright(contractName)}.${chalk.blue(method)}(${args
      .map((arg) => chalk.red(arg))
      .join(", ")})\n`
  );
  console.log(chalk.green("Contract address:"), tx.to);
  console.log(chalk.green("Value:"), "0");
  console.log(chalk.green("Data (hex-encoded):"), tx.data, "\n");
}

async function main() {
  await generateTx("Factory", "registerTemplate", [
    "0x0000000000000000000000000000000000000000",
  ]);
}

main();
