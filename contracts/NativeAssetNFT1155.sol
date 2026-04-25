// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title NativeAssetNFT1155
/// @notice For Asset rows where kind="nft_native". The tokenId IS the asset;
///         no separate receipt is needed. Suitable for multi-edition drops
///         (e.g. limited prints, music NFTs). Premium 1/1 drops should use a
///         per-collection ERC-721 instead (left as a Phase 2/3 contract).
/// @dev    Per-tokenId max supply enforced on-chain so off-chain edition
///         counts are tamper-proof.
contract NativeAssetNFT1155 is ERC1155, Ownable, IERC2981 {
    string public name = "Digitaleconomy.cloud Native";
    string public symbol = "DEC-N";

    address public minter;
    address public royaltyReceiver;
    uint96 public royaltyBps;

    mapping(uint256 => string) private _tokenUris;
    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => uint256) public totalMinted;

    event TokenConfigured(uint256 indexed tokenId, uint256 maxSupply, string uri);

    error NotMinter();
    error SupplyExceeded();
    error NotConfigured();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    constructor(address _minter, address _royaltyReceiver, uint96 _royaltyBps)
        ERC1155("")
        Ownable(msg.sender)
    {
        minter = _minter;
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function setRoyalty(address _receiver, uint96 _bps) external onlyOwner {
        require(_bps <= 1_000, "max 10%");
        royaltyReceiver = _receiver;
        royaltyBps = _bps;
    }

    /// @notice Owner registers a new asset/tokenId with its supply cap and uri
    ///         before any mints can happen.
    function configureToken(uint256 tokenId, uint256 _maxSupply, string calldata uri_)
        external
        onlyOwner
    {
        require(maxSupply[tokenId] == 0, "already configured");
        maxSupply[tokenId] = _maxSupply;
        _tokenUris[tokenId] = uri_;
        emit TokenConfigured(tokenId, _maxSupply, uri_);
    }

    function mintTo(address to, uint256 tokenId, uint256 amount) external onlyMinter {
        if (maxSupply[tokenId] == 0) revert NotConfigured();
        if (totalMinted[tokenId] + amount > maxSupply[tokenId]) revert SupplyExceeded();
        totalMinted[tokenId] += amount;
        _mint(to, tokenId, amount, "");
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenUris[tokenId];
    }

    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 amount)
    {
        return (royaltyReceiver, (salePrice * royaltyBps) / 10_000);
    }

    function supportsInterface(bytes4 id) public view virtual override(ERC1155, IERC165) returns (bool) {
        return id == type(IERC2981).interfaceId || super.supportsInterface(id);
    }
}
