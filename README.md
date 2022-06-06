# Solidity contracts

### Setup

1. Install dependencies:

```
npm install
```

2. Create an `.env` file:

```
cp template.env .env
```

3. Add wallet private key to `.env` file (`template.env` contains dummy private keys by default).

### Run tests

```
npm test
```

### Deployment

Deploy all contracts on `networkName`:

```
npm run deploy:{networkName}:all
```

Deploy a `contractName` on `networkName`:

```
npm run deploy:{networkName}:{contractName}
```

`networkName` is one of:

- `polygon`
- `mumbai` (Polygon testnet)
- `rinkeby` (Ethereum testnet)

To redeploy a contract that hasn't changed, delete it's deployment file under `deployments/{networkName}/` and run `npm run deploy:{networkName}:{contractName}` again.

To get a deployed contract's address, ABI, etc, check `deployments/{networkName}/{contractName}.json`.

### Verification

#### Preparation

1. Sign up for an account at https://etherscan.com and/or https://polygonscan.com
2. Go to https://polygonscan.com/myapikey and/or https://polygonscan.com/myapikey to generate your API keys.
3. Set `API_KEY_ETHERSCAN` and `API_KEY_POLYGONSCAN` in the `.env` file to the API keys generated in step 2.

#### To verify

This will verify all deployed contracts for the specified network.
You can check which ones have been deployed from the `.json` files in the `deployments/{networkName}/` folder.

```
npm run verify:{networkName}
```

`networkName` is one of:

- `polygon`
<<<<<<< verifying-deployed-contracts-readme
- `mumbai` (Polygon testnet) 
- `rinkeby` (Ethereum testnet)


### To verify already deployed contracts:
#### Setup
```
git clone https://github.com/poanetwork/solidity-flattener.git
cd solidity-flattener
npm install
```
#### Copy contracts to solidity-flattener directory
```
cp -r contracts solidity-flattener/contracts
cp node_modules/@openzeppelin solidity-flattener/contracts/@openzeppelin
```
#### Flatten solidity contract
```
cd solidity-flattener
npm start contract/contract.sol
```
2) Open Contract on Polygonscan/rinkeby.etherscan.io , click Contract -> Verify and Publish
3) Compiler type: Solidity (single file)
4) Compiler version: 0.8.9
5) License MIT
6) Optimization -> Yes
7) Paste flattened solidity code
8) Get ABI encoded constructor params
    - https://abi.hashex.org/, Put contract ABI there
    - Add constructor params
      (for empty values add some value and remove it so its empty)
9) Verify and publish
=======
- `mumbai` (Polygon testnet)
- `rinkeby` (Ethereum testnet)

### Release process

- [ ] Create a new branch
- [ ] Make your changes in the branch (contracts + corresponding tests)
- [ ] Open up a pull request and get confirmation that the changes are good to go
- [ ] Deploy any contracts (see [Deployment](#deployment)) and commit the generated artifacts. Any other services that rely on these contracts should use these artifacts.
- [ ] Get PR approved & merged
- [ ] Verify contracts (see [Verification](#verification))
>>>>>>> master
