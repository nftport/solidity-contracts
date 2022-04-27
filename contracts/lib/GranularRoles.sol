// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract GranularRoles is AccessControl {
    // Roles list
    // Admin role can have 2 addresses: 
    // one address same as (_owner) which can be changed 
    // one for NFTPort API access which can only be revoked
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    // Following roles can have multiple addresses, can be changed by admin or update contrac role
    bytes32 public constant MINT_ROLE = keccak256("MINT_ROLE");
    bytes32 public constant UPDATE_CONTRACT_ROLE = keccak256("UPDATE_CONTRACT_ROLE");
    bytes32 public constant UPDATE_TOKEN_ROLE = keccak256("UPDATE_TOKEN_ROLE");
    bytes32 public constant BURN_ROLE = keccak256("BURN_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    struct RolesAddresses {
        bytes32 role;
        address[] addresses;
        bool frozen;
    }

    // Admin role has all access granted by default 
    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        return super.hasRole(ADMIN_ROLE, account) || super.hasRole(role, account);
    }

    function _regularRoleValid(bytes32 role) internal returns (bool) {
        return 
            role == MINT_ROLE || 
            role == UPDATE_CONTRACT_ROLE ||
            role == UPDATE_TOKEN_ROLE ||
            role == BURN_ROLE ||
            role == TRANSFER_ROLE;
    }
}