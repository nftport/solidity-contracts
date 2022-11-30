// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NftInjectableTokenId is ERC721URIStorage, Ownable {

    // solhint-disable no-empty-blocks
    // solium-disable no-empty-blocks
    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function mintToCaller(address caller, uint256 tokenId, string memory tokenURI)
    public onlyOwner
    returns (uint256)
    {
        _safeMint(caller, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }
}
