// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NftInjectableTokenIdRolesUpdatable is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _owner;

    bool public isTokenUrisUpdatable;
    mapping (uint256 => bool) public updatableTokenUris;

    event PermanentURI(string _value, uint256 indexed _id); // https://docs.opensea.io/docs/metadata-standards
    event PermanentURIGlobal();

    constructor(string memory _name, string memory _symbol, address owner, bool _isTokenUrisUpdatable) ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(MINTER_ROLE, msg.sender);
        isTokenUrisUpdatable = _isTokenUrisUpdatable;
        _owner = owner;
    }

    function mintToCaller(address caller, uint256 tokenId, string memory tokenURI)
    public onlyRole(MINTER_ROLE)
    returns (uint256)
    {
        _safeMint(caller, tokenId);
        _setTokenURI(tokenId, tokenURI);

        if (isTokenUrisUpdatable) {
            updatableTokenUris[tokenId] = true;
        }
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

    function updateTokenUri(uint256 _tokenId, string memory _tokenUri)
    public 
    onlyRole(MINTER_ROLE) {
        require(_exists(_tokenId), "NFT: update URI query for nonexistent token");
        require(isTokenUrisUpdatable == true, "NFT: Token uris are frozen globally");
        require(updatableTokenUris[_tokenId] == true, "NFT: Token is not updatable");
        require(keccak256(bytes(tokenURI(_tokenId))) != keccak256(bytes(_tokenUri)), "NFT: New token URI is same as updated");
        _setTokenURI(_tokenId, _tokenUri);
    }


    function freezeTokenUri(uint256 _tokenId) 
    public 
    onlyRole(MINTER_ROLE) {
        require(_exists(_tokenId), "NFT: freeze URI query for nonexistent token");
        require(isTokenUrisUpdatable == true, "NFT: Token uris are frozen globally");
        require(updatableTokenUris[_tokenId] == true, "NFT: Token is not updatable");
        updatableTokenUris[_tokenId] = false;

        emit PermanentURI(tokenURI(_tokenId), _tokenId);
    }

    function freezeAllTokenUris() 
    public 
    onlyRole(MINTER_ROLE) {
        require(isTokenUrisUpdatable == true, "NFT: Token uris are already frozen");
        isTokenUrisUpdatable = false;

        emit PermanentURIGlobal();
    }
}
