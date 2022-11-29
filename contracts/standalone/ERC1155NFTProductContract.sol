// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../templates/ERC1155NFTProduct.sol";

contract ERC1155NFTProductContract is ERC1155NFTProduct {
    constructor(
        Config.Deployment memory deploymentConfig,
        Config.Runtime memory runtimeConfig,
        RolesAddresses[] memory rolesAddresses
    ) initializer {
        initialize(deploymentConfig, runtimeConfig, rolesAddresses);
    }
}