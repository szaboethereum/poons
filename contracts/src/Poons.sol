// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "solady/tokens/ERC721.sol";
import {OwnableRoles} from "solady/auth/OwnableRoles.sol";

interface IPoonsRenderer {
    function tokenURI(uint256 tokenId, uint256 seed) external view returns (string memory);
}

/// @dev ERC721-C creator token interface, used by OpenSea to enforce creator fees.
interface ICreatorToken {
    event TransferValidatorUpdated(address oldValidator, address newValidator);

    function getTransferValidator() external view returns (address validator);
    function getTransferValidationFunction() external view returns (bytes4 functionSignature, bool isViewFunction);
    function setTransferValidator(address validator) external;
}

interface ITransferValidator {
    function validateTransfer(address caller, address from, address to, uint256 tokenId) external view;
}

/// @title Poons
/// @notice Free, fully on-chain pixel NFTs. A wallet that buys $10+ of the project token on Pons in a
///         single buy earns exactly one Poon. Eligibility is decided off-chain by the indexer, which
///         calls `drop` with the wallets to reward. The contract enforces the hard rules itself:
///         one Poon per wallet, ever, and a fixed maximum supply.
///
///         Secondary sales pay a 5% creator fee to the owner: ERC2981 for marketplaces that read it,
///         and ERC721-C (OpenSea's transfer validator) so it is enforced on OpenSea. The validator
///         only screens operator-driven transfers (marketplaces); a holder moving their own Poon to
///         another wallet, mints and burns are never restricted.
contract Poons is ERC721, OwnableRoles, ICreatorToken {
    uint256 public constant MINTER_ROLE = _ROLE_0;

    struct Drop {
        address to;
        /// Qualifying buy happened on the Pons bonding curve, before the token graduated.
        bool founder;
    }

    uint256 public immutable maxSupply;
    uint256 public totalSupply;

    /// @notice Token id dropped to a wallet (0 = none). Independent of later NFT transfers, so a
    ///         wallet can never receive a second Poon by moving the first one away.
    mapping(address => uint256) public dropOf;
    /// @notice Art seed per token; the renderer derives every trait from it.
    mapping(uint256 => uint256) public seedOf;

    IPoonsRenderer public renderer;
    bool public rendererLocked;

    /// @notice 5% creator fee on secondary sales.
    uint256 public constant ROYALTY_BPS = 500;
    /// @notice Receives the creator fee. Starts as the owner; can later point to a treasury contract
    ///         without giving up ownership.
    address public royaltyReceiver;
    address private _transferValidator;

    event Dropped(address indexed to, uint256 indexed tokenId, uint256 seed);
    event RendererSet(address renderer);
    event RendererLocked();
    event RoyaltyReceiverSet(address receiver);
    /// @dev EIP-4906 so marketplaces refresh art after a renderer change.
    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);

    error RendererIsLocked();

    /// @param validator OpenSea's transfer validator (0xA000027A9B2802E1ddf7000061001e5c005A0000 on
    ///        Robinhood Chain mainnet) or address(0) where it isn't deployed (testnet).
    constructor(address owner_, address minter, uint256 maxSupply_, address validator) {
        _initializeOwner(owner_);
        _grantRoles(minter, MINTER_ROLE);
        maxSupply = maxSupply_;
        royaltyReceiver = owner_;
        _transferValidator = validator;
        emit TransferValidatorUpdated(address(0), validator);
    }

    function name() public pure override returns (string memory) {
        return "Poons";
    }

    function symbol() public pure override returns (string memory) {
        return "POONS";
    }

    /// @notice Batch airdrop, one Poon per wallet. Wallets that already received one are skipped
    ///         (never reverted), so retries are safe and one stale entry can't block a batch.
    function drop(Drop[] calldata drops) external onlyRoles(MINTER_ROLE) {
        uint256 id = totalSupply;
        uint256 cap = maxSupply;
        bytes32 entropy = blockhash(block.number - 1);
        for (uint256 i; i < drops.length && id < cap; ++i) {
            address to = drops[i].to;
            if (to == address(0) || dropOf[to] != 0) continue;
            ++id;
            // Seed depends on the wallet, not on its position in the batch, so the minter cannot
            // steer rare seeds to chosen wallets by reordering. Bit 255 carries the founder flag
            // (traits only read the low bits), so the renderer needs no extra storage.
            uint256 seed = uint256(keccak256(abi.encode(to, entropy))) >> 1;
            if (drops[i].founder) seed |= 1 << 255;
            seedOf[id] = seed;
            dropOf[to] = id;
            _mint(to, id);
            emit Dropped(to, id, seed);
        }
        totalSupply = id;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        if (!_exists(id)) revert TokenDoesNotExist();
        return renderer.tokenURI(id, seedOf[id]);
    }

    /// @notice The renderer stays swappable while the art is being finalised, then gets frozen.
    function setRenderer(IPoonsRenderer r) external onlyOwner {
        if (rendererLocked) revert RendererIsLocked();
        renderer = r;
        emit RendererSet(address(r));
        emit BatchMetadataUpdate(1, type(uint256).max);
    }

    function lockRenderer() external onlyOwner {
        rendererLocked = true;
        emit RendererLocked();
    }

    // ---------------------------------------------------------------- creator fees

    /// @notice ERC2981: 5% of the sale price to the royalty receiver.
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        return (royaltyReceiver, salePrice * ROYALTY_BPS / 10_000);
    }

    function setRoyaltyReceiver(address receiver) external onlyOwner {
        royaltyReceiver = receiver;
        emit RoyaltyReceiverSet(receiver);
    }

    function getTransferValidator() external view returns (address) {
        return _transferValidator;
    }

    function getTransferValidationFunction() external pure returns (bytes4 functionSignature, bool isViewFunction) {
        return (ITransferValidator.validateTransfer.selector, true); // 0xcaee23ea
    }

    function setTransferValidator(address validator) external onlyOwner {
        emit TransferValidatorUpdated(_transferValidator, validator);
        _transferValidator = validator;
    }

    /// @dev Mints (from == 0) and burns (to == 0) skip validation; the validator itself lets a
    ///      holder move their own token and only restricts marketplace operators.
    function _beforeTokenTransfer(address from, address to, uint256 id) internal view override {
        address v = _transferValidator;
        if (v != address(0) && from != address(0) && to != address(0)) {
            ITransferValidator(v).validateTransfer(msg.sender, from, to, id);
        }
    }

    function supportsInterface(bytes4 id) public view override returns (bool) {
        return id == 0x49064906 // EIP-4906
            || id == 0x2a55205a // ERC2981
            || id == type(ICreatorToken).interfaceId || super.supportsInterface(id);
    }
}
