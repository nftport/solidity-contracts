// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../lib/ITemplate.sol";

contract MockTemplate is Initializable, ITemplate {
    string public NAME = "MockTemplate";
    uint256 public VERSION = 1_00_00;

    constructor() initializer {}

    function initialize() public initializer {}

    function setVersion(uint256 version) external {
        VERSION = version;
    }

    function setName(string memory name) external {
        NAME = name;
    }
}
