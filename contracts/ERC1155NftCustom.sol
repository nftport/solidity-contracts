// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ERC1155NFTCustom is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _owner;

    bool public isFreezeTokenUris;
    mapping (uint256 => bool) public freezeTokenUris;

    string public baseURI;

    string public name;
    string public symbol;

    mapping (uint256 => uint256) public tokenSupply;
    mapping(uint256 => string) private _tokenURIs;

    event PermanentURI(string _value, uint256 indexed _id); // https://docs.opensea.io/docs/metadata-standards
    event PermanentURIGlobal();

    constructor(string memory _uri, string memory _name, string memory _symbol, address owner, bool _isFreezeTokenUris, string memory _initBaseURI) ERC1155(_uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(MINTER_ROLE, msg.sender);
        isFreezeTokenUris = _isFreezeTokenUris;
        baseURI = _initBaseURI;
        _owner = owner;
        name = _name;
        symbol = _symbol;
    }

    function setURI(string memory _newURI) public onlyRole(MINTER_ROLE) {
        _setURI(_newURI);
    }

    function updateTokenUri(uint256 _tokenId, string memory _newUri, bool _isFreezeTokenUri)
    public
    onlyRole(MINTER_ROLE) {
        require(_exists(_tokenId), "NFT: update URI query for nonexistent token");
        require(isFreezeTokenUris == false, "NFT: Token uris are frozen globally");
        require(freezeTokenUris[_tokenId] != true, "NFT: Token is frozen");
        require(_isFreezeTokenUri || (bytes(_newUri).length != 0), "NFT: Either _newUri or _isFreezeTokenUri=true required");

        if (bytes(_newUri).length != 0) {
            require(keccak256(bytes(_tokenURIs[_tokenId])) != keccak256(bytes(string(abi.encodePacked(_newUri)))), "NFT: New token URI is same as updated");
            _tokenURIs[_tokenId] = _newUri;
            emit URI(_newUri, _tokenId);
        }
        if (_isFreezeTokenUri) {
            freezeTokenUris[_tokenId] = true;
            emit PermanentURI(_tokenURIs[_tokenId], _tokenId);
        }
    }


    function update(string memory _newBaseURI, bool _freezeAllTokenUris)
    public
    onlyRole(MINTER_ROLE) {
        require(isFreezeTokenUris == false, "NFT: Token uris are already frozen");
        baseURI = _newBaseURI;
        if (_freezeAllTokenUris) {
            freezeAllTokenUris();
        }
    }

    function freezeAllTokenUris()
    public
    onlyRole(MINTER_ROLE) {
        require(isFreezeTokenUris == false, "NFT: Token uris are already frozen");
        isFreezeTokenUris = true;

        emit PermanentURIGlobal();
    }

    function totalSupply (uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function uri(uint256 _id) public override view returns (string memory) {
        if (bytes(_tokenURIs[_id]).length > 0) {
            if (bytes(baseURI).length > 0) {
                return string(abi.encodePacked(baseURI, _tokenURIs[_id]));
            } else {
                return _tokenURIs[_id];
            }
        } else {
            return super.uri(_id);
        }
    }

    function mintToCaller( address account, uint256 id, uint256 amount, string memory uri) public onlyRole(MINTER_ROLE) {
        require(!_exists(id), "NFT: token already minted");
        if (bytes(uri).length > 0) {
            _tokenURIs[id] = uri;
            emit URI(uri, id);
        }
        _mint(account, id, amount, "");
        tokenSupply[id] += amount;
    }

    function mintToCallerBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory uris
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(!_exists(ids[i]), "NFT: one of tokens are already minted");
            tokenSupply[ids[i]] += amounts[i];
            if (bytes(uris[i]).length > 0) {
                _tokenURIs[ids[i]] = uris[i];
                emit URI(uris[i], ids[i]);
            }
        }
        _mintBatch(to, ids, amounts, "");
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool)
    {
        return ERC1155.supportsInterface(interfaceId);
    }

    function owner() public view returns (address) {
        return _owner;
    }


    function _exists(uint256 _tokenId) internal view virtual returns (bool) {
        return tokenSupply[_tokenId] > 0;
    }

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public virtual onlyRole(MINTER_ROLE) {
        _burn(account, id, value);
        tokenSupply[id] -= value;
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public virtual onlyRole(MINTER_ROLE) {
        _burnBatch(account, ids, values);
        for (uint256 i = 0; i < ids.length; i++) {
            tokenSupply[ids[i]] -= values[i];
        }
    }
}
