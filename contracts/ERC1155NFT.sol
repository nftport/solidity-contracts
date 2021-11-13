// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC1155NFT is ERC1155, Ownable {

    mapping(uint256 => uint256) private balances;

    mapping(uint256 => address[]) private owners;

    constructor(string memory _uri) ERC1155(_uri) {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public payable onlyOwner {
        _mint(account, id, amount, data);
        balances[id] += amount;
        for (uint256 i = 0; i < owners[id].length; i++) {
            if (owners[id][i] == account) {
                return;
            }
        }
        owners[id].push(account);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
        for (uint256 i = 0; i < ids.length; i++) {
            balances[ids[i]] += amounts[i];
            for (uint256 j = 0; j < owners[ids[i]].length; j++) {
                if (owners[ids[i]][j] == to) {
                    return;
                }
            }
            owners[ids[i]].push(to);
        }
    }

    function tokenBalance(uint256 index) public view returns (uint256) {
        return balances[index];
    }

    function ownersCorrespondingToToken(uint256 index)
        public
        view
        returns (address[] memory)
    {
        return owners[index];
    }
}
