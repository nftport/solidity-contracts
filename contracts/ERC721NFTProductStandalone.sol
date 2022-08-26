// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./templates/ERC721NFTProduct.sol";

contract ERC721NFTProductStandalone is ERC721NFTProduct {
    constructor(
        Config.Deployment memory deploymentConfig,
        Config.Runtime memory runtimeConfig,
        RolesAddresses[] memory rolesAddresses
    ) initializer {
        initialize(deploymentConfig, runtimeConfig, rolesAddresses);
    }
}
