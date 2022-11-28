# ELI5

NFTPort uses the contract factory pattern to make it cheaper for our end users to deploy NFT contracts via our API. When a user requests a new contract to be deployed, we deploy a [minimal immutable proxy](https://eips.ethereum.org/EIPS/eip-1167) to an already deployed contract (template implementation) instead of deploying a full copy of the bytecode.

### Terminology

**Template** - a type of contract that can be deployed by the end user. Examples of templates are: `NFTCollection`, `ERC721NFTProduct`, `ERC1155NFTProduct`

**Template implementation** - a contract that implements a specific version of a template which the minimal user-deployed clones delegate their logic to. Template implementations are deployed by NFTPort once per version and will be registered in the Factory. An example of a template implementation is `NFTCollection` version `1_03_02` at address `0x387a294a2B92387cf46714FaA537F1F81d50c210`

**Template instance** - a proxy to a specific template implementation. Template instances are the contracts that are deployed for and used by NFTPort’s end users. An example of a template instance is contract `0x377f2fd104692E592A5259cF75756037AE180fcb` which is an instance of `NFTCollection` implementation `1_03_02`

# `Factory.sol`

## High-level overview

`Factory.sol` is the contract factory contract. Its responsibilities include:

- Keeping track of available templates and their implementations
- Deploying template instances
- Managing access rights for calling deployed template instances
- Proxying calls to deployed template instances

Factory is deployed as an upgradable contract so it consists of a proxy and an implementation.

## Roles

### Proxy owner

Owns the proxy contract for Factory, can upgrade the implementation. Should be set to a Gnosis Safe multisig.

### Factory admin (`ADMIN_ROLE`)

Administers the factory, including registering new template implementations, managing template instance whitelist status (aka allowing or disallowing it to be called via Factory) and withdrawing any fees from the Factory.

### Transaction signer (`SIGNER_ROLE`)

Allowed to sign transaction payloads for deploying and calling template instances.

Factory contains two sets of `deploy` and `call` methods. First set requires a signature from a wallet with the `SIGNER_ROLE`, the second one charges fees on deployments and contract calls.

The latter was supposed to support a client-side NFTPort SDK library. The development of the SDK didn’t get mapped out and started, however, so these functions are currently considered deprecated and will be removed.

The signature-based methods are the main interaction points for our API and the Factory. This design was chosen because we generate a new wallet for each NFTPort user and registering all of these wallets with the Factory would be too costly and time-consuming. Instead, any wallet that can present a valid signature from a `SIGNER_ROLE` is authorized to interact with the Factory without fees.

### Contract operator (`OPERATOR_ROLE(<instance address>)`)

Allowed to call the template instance. The role is generated based on instance address so it’s specific to each user contract. The wallet that deploys a template instance is granted its operator role by default.

### Unprivileged user

Actions currently available to an unprivileged user are deploying/calling template instances by paying fees (deprecated and will be removed) and calling the Factory’s `upgrade()` function to run migrations between versions. In practice, `upgrade()` is called atomically when the proxy implementation is upgraded so this action should effectively not be available.

# `NFTCollection.sol`

## High-level overview

`NFTCollection` is a template implementing the popular 10k profile picture type of NFT project format. It is configurable to reproduce a range of functionality that is common in similar contracts. Configuration is divided into two parts:

- `DeploymentConfig` is set at contract creation time and cannot be changed later. This includes options like max supply, token name and symbol etc. The exception is the `owner` property that cannot be changed by normal contract update methods but by explicitly calling `transferOwnership` in order to implement `Ownable`
- `RuntimeConfig` is configuration that can be changed after the contract has been created. Some options are accompanied by a flag to freeze them and lock out any future changes.

## Roles

### Contract owner

The guiding principle for designing access controls for this contract was that functional access will be delegated to NFTPort’s execution wallet but our end users are the ultimate custodians of their contracts. They are free to revoke NFTPort’s access to their contract and stop using our API if they so choose. This is expressed by the contract owner role which also gets the root admin role from `AccessControl`.

### `AccessControl` root role (`DEFAULT_ADMIN_ROLE`)

Granted to the contract owner and moves alongside contract ownership.

### Contract admin (`ADMIN_ROLE`)

Allowed to update contract configuration and mint from the reserved supply. This is the role that is granted to NFTPort’s execution wallet.

### Unprivileged user

Allowed to mint either via regular `mint()` or, if whitelisted, using `presaleMint()`

# `ERC721NFTProduct.sol`, `ERC1155NFTProduct.sol`

What we call “product contracts” are very simple NFT contracts that expose core NFT functionality (mints, metadata updates, burns, transfers) and leave implementing the business logic to the user’s API or service. There are two such templates, one implementing the ERC-721 token standard and the other implementing ERC-1155. Similarly to `NFTCollection` they are configurable with options split between deployment-time and runtime-updatable sets.

## Roles

### Contract owner

The ultimate owner of the contract, similar to `NFTCollection`

### Contract admin (`ADMIN_ROLE`)

Superuser role that has the privileges of all other roles (with the exception of contract ownership).

### Minter (`MINT_ROLE`)

Allowed to mint new tokens.

### Contract updater (`UPDATE_CONTRACT_ROLE`)

Allowed to update contract configuration.

### Token updater (`UPDATE_TOKEN_ROLE`)

Allowed to update token metadata.

### Token burner (`BURN_ROLE`)

Allowed to burn tokens that belong to the contract owner.

### Token transferrer (`TRANSFER_ROLE`)

Allowed to transfer tokens that belong to the contract owner.

### Unprivileged user

Should have no special rights besides standard ERC-721/1155 functionality.
