// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ERC1155NFTCustom is ERC1155, AccessControl {

    using SafeMath for uint256;

    string public name;
    string public symbol;

    mapping (uint256 => uint256) public tokenSupply;
    mapping (uint256 => string) customUri;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address private _owner;

    constructor(string memory _uri, string memory _name, string memory _symbol, address owner) ERC1155(_uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(MINTER_ROLE, msg.sender);
        _owner = owner;
        name = _name;
        symbol = _symbol;
    }

    function setURI(string memory newuri) public onlyRole(MINTER_ROLE) {
        _setURI(newuri);
    }

    function setCustomURI(uint256 _tokenId, string memory _newURI) public onlyRole(MINTER_ROLE) {
        customUri[_tokenId] = _newURI;
        emit URI(_newURI, _tokenId);
    }

    function totalSupply (uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function uri(uint256 _id) public override view returns (string memory) {
        bytes memory customUriBytes = bytes(customUri[_id]);

        if (customUriBytes.length > 0) {
            return customUri[_id];
        } else {
            return super.uri(_id);
        }
    }

    function mint( address account, uint256 id, uint256 amount, bytes memory data, string memory uri) public onlyRole(MINTER_ROLE)
    returns (uint256) {
        if (bytes(uri).length > 0) {
            customUri[id] = uri;
            emit URI(uri, id);
        }
        _mint(account, id, amount, data);
        tokenSupply[id] = tokenSupply[id].add(amount);

        return id;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool)
    {
        return ERC1155.supportsInterface(interfaceId);
    }

    function owner() public view returns (address) {
        return _owner;
    }
}
