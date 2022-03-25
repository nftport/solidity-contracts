
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
