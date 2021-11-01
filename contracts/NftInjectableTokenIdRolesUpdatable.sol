// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NftInjectableTokenIdRolesUpdatable is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _owner;

    bool public isFreezeTokenUris;
    mapping (uint256 => bool) public freezeTokenUris;

    event PermanentURI(string _value, uint256 indexed _id); // https://docs.opensea.io/docs/metadata-standards
    event PermanentURIGlobal();

    constructor(string memory _name, string memory _symbol, address owner, bool _isFreezeTokenUris) ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(MINTER_ROLE, msg.sender);
        isFreezeTokenUris = _isFreezeTokenUris;
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

    function updateTokenUri(uint256 _tokenId, string memory _tokenUri, bool _isFreezeTokenUri)
    public
    onlyRole(MINTER_ROLE) {
        require(_exists(_tokenId), "NFT: update URI query for nonexistent token");
        require(isFreezeTokenUris == false, "NFT: Token uris are frozen globally");
        require(freezeTokenUris[_tokenId] != true, "NFT: Token is frozen");
        require(_isFreezeTokenUri || (bytes(_tokenUri).length != 0), "NFT: Either _tokenUri or _isFreezeTokenUri=true required");

        if (bytes(_tokenUri).length != 0) {
            require(keccak256(bytes(tokenURI(_tokenId))) != keccak256(bytes(_tokenUri)), "NFT: New token URI is same as updated");
            _setTokenURI(_tokenId, _tokenUri);
        }
        if (_isFreezeTokenUri) {
            freezeTokenUris[_tokenId] = true;
            emit PermanentURI(tokenURI(_tokenId), _tokenId);
        }
    }

    function freezeAllTokenUris()
    public
    onlyRole(MINTER_ROLE) {
        require(isFreezeTokenUris == false, "NFT: Token uris are already frozen");
        isFreezeTokenUris = true;

        emit PermanentURIGlobal();
    }
}
