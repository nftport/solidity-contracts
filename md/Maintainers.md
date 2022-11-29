# Factory owner's manual

## `Factory` release process

Rolling out a new `Factory` version is a four-step process:

1. Deploy a new `Factory` implementation
2. Upgrade proxy to the new implementation
3. Verify the new implementation
4. Commit and tag deployment files

### Step 1: Deploying the new implementation contract

All smart contract deployments are managed using `hardhat-deploy`.
`Factory` is deployed using the script `deploy/00_deploy_factory.js`.
You can execute it with:

```
npm run deploy:<network> -- --tags Factory
```

This deploys the new implementation contract and runs the upgrade method in the proxy contract.
Because the deployment file specifies that the proxy upgrade transaction should come from a named account called `factoryOwner`, `hardhat-deploy` will try to find a matching signer and if none are found, assumes that the account is an external one and prints out transaction data to execute.

### Step 2: Upgrading the proxy

Get the transaction data from Step 1 and execute it through the appropriate multisig. See [Transacting using multisig](#transacting-using-multisig) for details.

### Step 3: Verify contracts

To verify any newly deployed contracts, run:

```
npm run verify:<network name>
```

Note that this will verify _all_ unverified deployments and there's currently no way of verifying just a subset.

### Step 4: Tagging the release

Commit the new deployment artifacts using:

```
git add deployments/
git commit -m "<commit message>"
```

Releases should be tagged in the format `Factory/<contract version>` (e.g. `Factory/1_00_00`).
To create a new release tag, run:

```
git tag Factory/<version>
git push && git push --tags
```

## Template release process

Rolling out a new template implementation, either a completely new template or a new version of an existing template, is a four-step process:

1. Deploy the template contract
2. Register the template with `Factory`
3. Verify the new template
4. Commit and tag deployment files

### Step 1: Deploying the template

Template deployment scripts can be found under `deploy/`.
They can be executed by running:

```
npm run deploy:<network> -- --tags <template name>
```

The template deployment scripts compile and deploy the template contracts and execute the template registration method in `Factory`
Like with `Factory` upgrades, the deployment script specifies that the template registration transaction should come from the `factoryOwner` wallet so `hardhat-deploy` will try to find a matching signer and if none are found, assumes that the account is an external one and prints out transaction data to execute.

### Step 2: Upgrading the proxy

Get the transaction data from Step 1 and execute it through the appropriate multisig. See [Transacting using multisig](#transacting-using-multisig) for details.

### Step 3: Verify contracts

To verify any newly deployed contracts, run:

```
npm run verify:<network name>
```

Note that this will verify _all_ unverified deployments and there's currently no way of verifying just a subset.

### Step 4: Tagging the release

Commit the new deployment artifacts using:

```
git add deployments/
git commit -m "<commit message>"
```

Releases should be tagged in the format `<template name>/<contract version>` (e.g. `NFTCollection/1_00_00`).
To create a new release tag, run:

```
git tag <template name>/<version>
git push && git push --tags
```

## Factory management

All other `Factory` management also needs to be done via the multisig.
A helper script for generating transaction data can be found at `scripts/generate-gnosis-tx.js`.
To generate a new transaction, open up the script file and edit the method name and parameters under the `main()` function.
Save the file and run the script using:

```
npm run gnosis:<network name>
```

This will print out transaction details which you can execute following the steps in [Transacting using multisig](#transacting-using-multisig).

## Transacting using multisig

1. Find the Gnosis multisig URL for the required chain in `hardhat.config.json` under `namedAccounts` -> `factoryOwner` -> code comments.
2. Open up the Gnosis multisig in your browser.
3. Go to `New Transaction` -> `Contract Interaction` -> turn on `Use custom data (hex encoded)`.
4. Fill in transaction details. In the majority of cases `Value` should stay 0.
5. Click `Review`. In the `Transaction validity` section there's a link to generate a transaction simulation using Tenderly. This should be done every time before submitting the transaction to check if everything will go through smoothly and to get a detailed trace of what's about to happen.
6. If everything is OK, click `Submit`, sign the transaction and get another signer to execute it.
