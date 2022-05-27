// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./lib/GranularRoles.sol";
import "./lib/Base64.sol";
import "./lib/Config.sol";

contract ERC1155NFTCustom is ERC1155, GranularRoles {
    using Strings for uint256;

    uint16 constant ROYALTIES_BASIS = 10000;

    bool public metadataUpdatable;
    bool public tokensBurnable;
    bool public tokensTransferable;

    string public name;
    string public symbol;
    string public baseURI;

    address public royaltiesAddress;
    uint256 public royaltiesBasisPoints;

    mapping (uint256 => bool) public freezeTokenUris;
    mapping (uint256 => uint256) public tokenSupply;
    mapping(uint256 => string) private _tokenURIs;

    event PermanentURI(string _value, uint256 indexed _id); // https://docs.opensea.io/docs/metadata-standards
    event PermanentURIGlobal();

    string constant DEFAULT_URI = "";

    constructor(
        Config.Deployment memory deploymentConfig,
        Config.Runtime memory runtimeConfig,
        RolesAddresses[] memory rolesAddresses
    ) ERC1155(DEFAULT_URI) {
        royaltiesAddress = runtimeConfig.royaltiesAddress;
        royaltiesBasisPoints = runtimeConfig.royaltiesBps;

        metadataUpdatable = runtimeConfig.metadataUpdatable;
        tokensBurnable = deploymentConfig.tokensBurnable;
        tokensTransferable = runtimeConfig.tokensTransferable;
        baseURI = runtimeConfig.baseURI;

        name = deploymentConfig.name;
        symbol = deploymentConfig.symbol;

        _initRoles(deploymentConfig.owner, rolesAddresses);
    }

    function setURI(string memory _newURI) public onlyRole(UPDATE_CONTRACT_ROLE) {
        _setURI(_newURI);
    }

    function updateTokenUri(uint256 _tokenId, string memory _newUri, bool _isFreezeTokenUri)
    public
    onlyRole(UPDATE_TOKEN_ROLE) {
        require(_exists(_tokenId), "NFT: update URI query for nonexistent token");
        require(metadataUpdatable, "NFT: Token uris are frozen globally");
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

    function burn(
        uint256 id,
        uint256 value
    ) public onlyRole(BURN_ROLE) {
        require(tokensBurnable, "NFT: tokens burning is disabled");

        _burn(_owner, id, value);
        tokenSupply[id] -= value;
    }

    function burnBatch(
        uint256[] memory ids,
        uint256[] memory values
    ) public onlyRole(BURN_ROLE) {
        require(tokensBurnable, "NFT: tokens burning is disabled");
        _burnBatch(_owner, ids, values);
        for (uint256 i = 0; i < ids.length; i++) {
            tokenSupply[ids[i]] -= values[i];
        }
    }

    function transferByOwner(
        address to,
        uint256 id,
        uint256 amount
    ) public onlyRole(TRANSFER_ROLE) {
        require(tokensTransferable, "NFT: Transfers by owner are disabled");
        _safeTransferFrom(_owner, to, id, amount, "");
    }

    function transferByOwnerBatch(
        address[] memory to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyRole(TRANSFER_ROLE) {
        require(tokensTransferable, "NFT: Transfers by owner are disabled");
        for (uint256 i = 0; i < ids.length; i++) {
            _safeTransferFrom(_owner, to[i], ids[i], amounts[i], "");
        }
    }

    function update(
        Config.Runtime calldata newConfig,
        RolesAddresses[] memory rolesAddresses,
        bool isRevokeNFTPortPermissions
    ) public
    onlyRole(UPDATE_CONTRACT_ROLE) {
        // If metadata is frozen, baseURI cannot be updated
        require(
            metadataUpdatable ||
            (keccak256(abi.encodePacked(newConfig.baseURI)) ==
                keccak256(abi.encodePacked(baseURI))),
            "Metadata is frozen"
        );

        baseURI = newConfig.baseURI;
        royaltiesAddress = newConfig.royaltiesAddress;
        royaltiesBasisPoints = newConfig.royaltiesBps;

        if (!newConfig.tokensTransferable) {
            tokensTransferable = false;
        }
        if (!newConfig.metadataUpdatable && metadataUpdatable) {
            metadataUpdatable = false;
            emit PermanentURIGlobal();
        }

        _updateRoles(rolesAddresses);

        if (isRevokeNFTPortPermissions) {
            revokeNFTPortPermissions();
        }
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

    function mintByOwner( address account, uint256 id, uint256 amount, string memory uri) 
    public
    onlyRole(MINT_ROLE) {
        require(!_exists(id), "NFT: token already minted");
        if (bytes(uri).length > 0) {
            _tokenURIs[id] = uri;
            emit URI(uri, id);
        }
        _mint(account, id, amount, "");
        tokenSupply[id] += amount;
    }

    function mintByOwnerBatch(
        address[] memory to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory uris
    ) public onlyRole(MINT_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(!_exists(ids[i]), "NFT: one of tokens are already minted");
            require(to[i] == address(to[i]), "NFT: one of addresses is invalid");
            require(amounts[i]>0, "NFT: all amounts must be > 0");
            tokenSupply[ids[i]] += amounts[i];
            if (bytes(uris[i]).length > 0) {
                _tokenURIs[ids[i]] = uris[i];
                emit URI(uris[i], ids[i]);
            }
            _mint(to[i], ids[i], amounts[i], "");
        }
    }

    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address, uint256) {
        return (royaltiesAddress, royaltiesBasisPoints * salePrice / ROYALTIES_BASIS);
    }

    function contractURI() external view returns (string memory) {
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        // solium-disable-next-line quotes
                        '{"seller_fee_basis_points": ', // solhint-disable-line
                        royaltiesBasisPoints.toString(),
                        // solium-disable-next-line quotes
                        ', "fee_recipient": "', // solhint-disable-line
                        uint256(uint160(royaltiesAddress)).toHexString(20),
                        // solium-disable-next-line quotes
                        '"}' // solhint-disable-line
                    )
                )
            )
        );

        string memory output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool)
    {
        return ERC1155.supportsInterface(interfaceId) || interfaceId == type(IERC2981).interfaceId;
    }

    function _exists(uint256 _tokenId) internal view virtual returns (bool) {
        return tokenSupply[_tokenId] > 0;
    }
}