const chalk = require("chalk");
const { ethers } = require("hardhat");

async function main() {
  const factory = await ethers.getContract("Factory");
  console.log(chalk.blue("[Factory]"));
  console.log(`Code version: \t${await factory.CODE_VERSION()}`);
  console.log(`State version: \t${await factory.version()}`);

  const templateNames = await factory.templates();

  for (const templateName of templateNames) {
    console.log(`\n${chalk.blue(`[${templateName}]`)}`);

    const versions = await factory.versions(templateName);
    const templateData = {};

    for (const templateVersion of versions) {
      templateData[templateVersion] = {
        implementation: await factory.implementation(
          templateName,
          templateVersion
        ),
      };
    }

    console.table(templateData);
  }
}

main();
