# EVM minting

## Architecture overview

### Background & motivation

When an NFTPort user requests to deploy a custom contract on Polygon or Rinkeby, the API submits a transaction on-chain to create a new contract with some precompiled bytecode.
That bytecode contains the full contract code and deploying it will essentially create a complete copy on the blockchain with different initialization options.
This is also why once we verify one instance of that contract, all other instances become verified as well - they all have identical bytecode.

This approach is feasible on chains where storage costs are negligible.
If we want to expand to more expensive chains like Ethereum, deploying lots of bytecode like that will be prohibitively expensive for our users.
To bring the costs down, EVM minting architecture uses the contract factory pattern.

Instead of creating new copies of a contract, only one full instance of contract bytecode is deployed.
User-requested instances will be created as lightweight minimal proxies that delegate their logic to the one full deployment via EVM's `delegatecall` instruction.
For more background on how those minimal proxies work, read [EIP 1167](https://eips.ethereum.org/EIPS/eip-1167) and OpenZeppelin's [Clone](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Clones) documentation.

The result is that we can deploy arbitrary contract instances for our user's with a low, constant cost.
For an example, a standalone `NFTCollection` costs ~3.9M gas to deploy, while a proxy can be deployed for just ~515k gas ($651 vs $85).

### Contract factory

`Factory.sol` is the factory contract that can be used to deploy and later manage copies of template contracts in a gas-efficient way.

The factory has the following responsibilities:

1. Keeping track of templates (contracts that can be cloned)
2. Deploying contract instances (clones of templates)
3. Proxying calls to deployed instances
4. Charging fees from users who want to use the factory

### Contract templates

Contract templates are contracts that are deployed to the blockchain but cannot be initialized or used directly.
Their only function is to store the code that proxies delegate their logic to.

### Contract instances

Contract instances are ligthweight proxies that rely on a contract implementation for their logic.

### Fees and fee management

- We have two sets of `deploy()` and `call()` functions:
  - one that charges service fees - required for developers using NFTPort SDK or the factory directly
  - another set that doesn't require any fees - used by our API wallets
- How to authenticate the no-service-fee versions?
  - can't really pre-register NFTPort API wallets in the factory - would be expensive due to the number of wallets we have (one per API key), multiple supported chains etc
  - can't really register wallets on-demand, e.g. when a user tries to make their first deployment - would be cheaper but slows down the DX since there's an extra transaction to wait for
- Solution: signatures
  - we have a signer wallet and overloaded `deploy()` and `call()` methods that take a signature as an extra parameter
  - as long as there's a valid signature, you can use these methods without any service fees

## Release process

1. Deploy contracts
2. Verify contracts
3. Commit deployment artifacts that get generated under `deployments/<network>/<contract>.json`
4. Tag release

## Deploying & verifying contracts

Only standalone contracts should currently be deployed.
Contracts in this repository are meant to be deployed by cloning an implementation through `Factory`.
To enable them to be used in the current Polygon setup, where full contract bytecode is deployed directly, there are versions under `contracts/standalone` that can be used independently.
There is a `rollout:standalone` script to simplify the process.

```
npm run rollout:standalone
```

This deploys all standalone contracts to both Rinkeby and Polygon and verifies them with Etherscan and Polygonscan.

## Release tagging

Release tags have the format of `<component>/<version>`, such as `Factory/1_00_00` or `NFTCollection/1_00_00`.
Tag the commit that contains the updated deployment artifacts (`deployments/` folder).

## Sample code

There are some code samples for interacting with the contract factory using `web3.js` in `scripts/sample-code.js`.
To run the samples, first start a local Hardhat node with `npm run node` and then run the script with `node scripts/sample-code.js`.

## Sending transactions to Factory via Gnosis

1. Write your contract call code in `scriptes/generate-gnosis-tx.js`
2. Execute `npm run gnosis:<rinkeby|mainnet>`
3. Open up the Gnosis Safe URL
4. Click `New transaction` -> `Contract interaction` -> toggle `Use custom data (hex encoded)`
5. Copy in the values from step 2
6. Sign and execute the transaction

## Development cookbook

### Getting multiple versions of NFTCollection deployed locally

1. Check out an older version of the contract, e.g. `git checkout NFTCollection/1_02_01`
2. Start local Hardhat node with `npm run node`. This will also execute all the deployment scripts from `deploy/`. Do not stop this node during later steps.
3. Deploy a test collection.
   3a. For `1_02_01` or any other revisions: run `npx hardhat run --network localhost scripts/create-test-collection.js`.
   3b. Otherwise run `npm run create-test-collection`
4. Check out another version, e.g. `git checkout <branch>`
5. Run deployment scripts to deploy and upgrade the Factory to the latest collection template with `npm run deploy:localhost`
6. Deploy a test collection with `npm run create-test-collection`
