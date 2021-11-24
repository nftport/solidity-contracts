// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract ERC721NFT is Ownable, ERC721URIStorage {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // solhint-disable no-empty-blocks
    // solium-disable no-empty-blocks
    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function mintToCaller(address caller, string memory tokenURI)
    public onlyOwner
    returns (uint256)
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(caller, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
    // tokenURI points to a JSON file that conforms to the "ERC721 Metadata JSON Schema".
}