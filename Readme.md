# Solidity contracts

This repository contains smart contracts used by NFTPort's APIs.

## Setup

### Step 1: Install dependencies

```
npm install
```

### Step 2: Prepare environment variables

- Create a copy of the `template.env` file
- Make sure this file does not get added to the repository (add it to `.gitignore`).
- Fill out wallet details and API keys in your new `.env` file
- Make sure your new `.env` file is exported into the environment. You can use something like [direnv](https://direnv.net/) or simply `source <your .env file name>`

## Development & testing

Run the test suite (including gas usage and contract size estimates):

```
npm test
```

Generate code coverage reports:

```
npm run coverage
```

Generate docs based on NatSpec code comments:

```
npm run docs
```

Run a local Hardhat node:

```
npm run node
```
