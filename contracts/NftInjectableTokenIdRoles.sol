// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NftInjectableTokenIdRoles is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _owner;

    constructor(string memory _name, string memory _symbol, address owner) ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(MINTER_ROLE, msg.sender);
        _owner = owner;
    }


    function mintToCaller(address caller, uint256 tokenId, string memory tokenURI)
    public onlyRole(MINTER_ROLE)
    returns (uint256)
    {
        _safeMint(caller, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }


    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, AccessControl)
    returns (bool)
    {
        return ERC721.supportsInterface(interfaceId);
    }

    function owner() public view returns (address) {
        return _owner;
    }
}
