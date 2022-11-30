// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ERC1155NFT is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public name;
    string public symbol;

    mapping (uint256 => uint256) public tokenSupply;
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _uri, string memory _name, string memory _symbol) ERC1155(_uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        name = _name;
        symbol = _symbol;
    }

    function setURI(string memory _newURI) public onlyRole(MINTER_ROLE) {
        _setURI(_newURI);
    }

    function totalSupply (uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function uri(uint256 _id) public override view returns (string memory) {
        if (bytes(_tokenURIs[_id]).length > 0) {
            return _tokenURIs[_id];
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
            require(amounts[i]>0, "NFT: all amounts must be > 0");
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

    function _exists(uint256 _tokenId) internal view virtual returns (bool) {
        return tokenSupply[_tokenId] > 0;
    }
}
