# Solidity contracts

### Setup:

1. Install dependencies:

```
npm install
```

2. Create an `.env` file:

```
cp template.env .env
```

3. Add wallet private key to `.env` file (`template.env` contains dummy private keys by default).

### Run tests:

```
npm test
```

### Deployment:

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

### To get the contracts bytecode:

```
npx hardhat compile
```

Check `artifacts/contracts/{contractName}.sol/{contractName}.json["bytecode"]`

### Verification

#### Preparation:

1. Sign up for an account at https://etherscan.com and/or https://polygonscan.com
2. Go to https://polygonscan.com/myapikey and/or https://polygonscan.com/myapikey to generate your API keys.
3. Set `API_KEY_ETHERSCAN` and `API_KEY_POLYGONSCAN` in the `.env` file to the API keys generated in step 2.

#### To verify:

This will verify all deployed contracts for the specified network.
You can check which ones have been deployed from the `.json` files in the `deployments/{networkName}/` folder.

```
npm run verify:{networkName}
```

`networkName` is one of:

- `polygon`
- `mumbai` (Polygon testnet)
- `rinkeby` (Ethereum testnet)
