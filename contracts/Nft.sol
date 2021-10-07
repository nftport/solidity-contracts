// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract NFT is Ownable, ERC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    bool public globalUpdatableTokenUri;
    mapping (uint256 => bool) public updatableTokenUris;

    event PermanentURI(string _value, uint256 indexed _id); // https://docs.opensea.io/docs/metadata-standards
    event PermanentURIGlobal();

    constructor(string memory _name, string memory _symbol, bool _globalUpdatableTokenUri) ERC721(_name, _symbol) {
        globalUpdatableTokenUri = _globalUpdatableTokenUri;
    }

    function mintToCaller(address _caller, string memory _tokenURI)
    public onlyOwner
    returns (uint256)
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(_caller, newItemId);
        _setTokenURI(newItemId, _tokenURI);

        if (globalUpdatableTokenUri) {
            updatableTokenUris[newItemId] = true;
        }
        return newItemId;
    }
    // tokenURI points to a JSON file that conforms to the "ERC721 Metadata JSON Schema".

    function updateTokenUri(uint256 _tokenId, string memory _tokenUri)
    public onlyOwner {
        require(_exists(_tokenId), "NFT: update URI query for nonexistent token");
        require(globalUpdatableTokenUri == true, "NFT: Token uris are frozen globally");
        require(updatableTokenUris[_tokenId] == true, "NFT: Token is not updatable");
        require(keccak256(bytes(tokenURI(_tokenId))) != keccak256(bytes(_tokenUri)), "NFT: New token URI is same as updated");
        _setTokenURI(_tokenId, _tokenUri);
    }


    function freezeTokenUri(uint256 _tokenId) 
    public onlyOwner {
        require(_exists(_tokenId), "NFT: freeze URI query for nonexistent token");
        require(globalUpdatableTokenUri == true, "NFT: Token uris are frozen globally");
        require(updatableTokenUris[_tokenId] == true, "NFT: Token is not updatable");
        updatableTokenUris[_tokenId] = false;

        emit PermanentURI(tokenURI(_tokenId), _tokenId);
    }

    function freezeAllTokenUris() 
    public onlyOwner {
        require(globalUpdatableTokenUri == true, "NFT: Token uris are already frozen");
        globalUpdatableTokenUri = false;

        emit PermanentURIGlobal();
    }
}
