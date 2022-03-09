
# Solidity contracts

### Setup:

```
npm install
```

### Run tests:

```
cp template.env .env
```

```
npx hardhat test --network hardhat
```

### Deployment:

```
cp template.env .env
```

Add wallet private key to `.env` file (template.env contains dummy private keys by default).

```
npm run deploy:{networkName}
```

`networkName` is one of:
- `polygon`
- `mumbai` (Polygon testnet) 
- `rinkeby` (Ethereum testnet)

### To get the contracts bytecode:
```
npx hardhat compile
```
Check artifacts/contracts/{contractName}.sol/{contractName}.json["bytecode"]


### Verification

#### Preparation:
1. Sign up for an account at https://etherscan.com and/or https://polygonscan.com
2. Go to https://polygonscan.com/myapikey and/or https://polygonscan.com/myapikey to generate your API keys.
3. Set `API_KEY_ETHERSCAN` and `API_KEY_POLYGONSCAN` in the `.env` file to the API keys generated in step 2.

#### To verify:
```
npm run verify:{networkName}
```

`networkName` is one of:
- `polygon`
- `mumbai` (Polygon testnet) 
- `rinkeby` (Ethereum testnet)