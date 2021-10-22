
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


### Verifying contracts on Polygonscan

1) Flatten contract source code
```
npm i @poanet/solidity-flattener
poa-solidity-flattener ./contracts/contract.sol
```
2) Open Contract on Polygonscan, click Contract -> Verify and Publish
3) Compiler type: Solidity (single file)
4) Compiler version: 0.8.0
5) License MIT
6) Optimization -> Yes
7) Paste flattened solidity code
8) Get ABI encoded constructor params
    - https://abi.hashex.org/, Put contract ABI there
    - Add constructor params (can be taken from nft_contract table)
9) Verify and publish    

