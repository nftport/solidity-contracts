
# Polygon contracts

### Setup:
```
npm install
```

### Run tests:
```
npx hardhat test --network hardhat
```

### Deployment:
```
cp template.env .env
```
Add wallet private key to .env file 
```
npx hardhat run scripts/deploy-script.js --network matic
```
#### MAINNET:
```
npx hardhat run scripts/deploy-script.js --network maticMainnet
```

##### To get the contracts bytecode:
```
npx hardhat compile
```
Check artifacts/contracts/{contractName}.sol/{contractName}.json["bytecode"]

