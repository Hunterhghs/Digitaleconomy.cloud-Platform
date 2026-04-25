// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title ReceiptNFT1155
/// @notice One ERC-1155 tokenId per off-chain Asset (kind="file", "stream",
///         "license_key", "ai_asset"). Minted on each purchase as portable
///         proof of license. The platform's relayer is the sole minter; gas
///         is paid by the platform so buyers never see a wallet prompt unless
///         they explicitly connect one.
/// @dev    EIP-2981 royalties are baked in for Phase 3 secondary-market work.
///         tokenURI is set per-tokenId on first mint and points to the
///         platform's metadata endpoint.
contract ReceiptNFT1155 is ERC1155, Ownable, IERC2981 {
    string public name = "Digitaleconomy.cloud Receipts";
    string public symbol = "DEC-R";

    address public minter; // hot relayer
    address public royaltyReceiver;
    uint96 public royaltyBps; // out of 10_000

    mapping(uint256 => string) private _tokenUris;

    event MinterUpdated(address minter);
    event RoyaltyUpdated(address receiver, uint96 bps);
    event TokenUriSet(uint256 indexed tokenId, string uri);

    error NotMinter();

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
        emit MinterUpdated(_minter);
        emit RoyaltyUpdated(_royaltyReceiver, _royaltyBps);
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    function setRoyalty(address _receiver, uint96 _bps) external onlyOwner {
        require(_bps <= 1_000, "max 10%");
        royaltyReceiver = _receiver;
        royaltyBps = _bps;
        emit RoyaltyUpdated(_receiver, _bps);
    }

    /// @notice Mint a receipt copy to `to` for `tokenId`. First call also
    ///         sets the tokenURI; subsequent calls reuse it.
    function mintTo(address to, uint256 tokenId, uint256 amount, string calldata uri_)
        external
        onlyMinter
    {
        if (bytes(_tokenUris[tokenId]).length == 0 && bytes(uri_).length > 0) {
            _tokenUris[tokenId] = uri_;
            emit TokenUriSet(tokenId, uri_);
        }
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
