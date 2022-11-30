// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../templates/NFTCollection.sol";

contract NFTCollectionContract is NFTCollection {
    constructor(
        DeploymentConfig memory deploymentConfig,
        RuntimeConfig memory runtimeConfig
    ) initializer {
        initialize(deploymentConfig, runtimeConfig);
    }
}
