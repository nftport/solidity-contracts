// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ERC1155NFT is ERC1155, Ownable {

    using SafeMath for uint256;

    mapping(uint256 => uint256) private balances;
    mapping(uint256 => address[]) private owners;

    string public name;
    string public symbol;

    mapping (uint256 => uint256) public tokenSupply;
    mapping (uint256 => string) customUri;

    constructor(string memory _uri, string memory _name, string memory _symbol) ERC1155(_uri) {
          name = _name;
          symbol = _symbol;
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function setCustomURI(uint256 _tokenId, string memory _newURI) public onlyOwner {
        customUri[_tokenId] = _newURI;
        emit URI(_newURI, _tokenId);
    }

    function totalSupply (uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function uri(uint256 _id) override public view returns (string memory) {
          bytes memory customUriBytes = bytes(customUri[_id]);

          if (customUriBytes.length > 0) {
              return customUri[_id];
          } else {
              return super.uri(_id);
          }
    }

    function mint( address account, uint256 id, uint256 amount, bytes memory data, string memory uri) public onlyOwner {
            if (bytes(uri).length > 0) {
                customUri[id] = uri;
                emit URI(uri, id);
            }
            _mint(account, id, amount, data);
            tokenSupply[id] = tokenSupply[id].add(amount);

            for (uint256 i = 0; i < owners[id].length; i++) {
                  if (owners[id][i] == account) {
                      return;
                  }
            }
            owners[id].push(account);
    }

    function ownersCorrespondingToToken(uint256 index) public view returns (address[] memory){
            return owners[index];
    }
}
