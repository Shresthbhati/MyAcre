// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PropertyToken
/// @notice Fractional real-estate ownership as ERC-1155 tokens. Each property
/// (a MyAcre "listing") is one token id; a holder's balance is the number of
/// square feet they own of that property. One contract serves every listing.
///
/// `propertyId` is derived off-chain from the listing's UUID
/// (uint256(keccak256(bytes(uuid)))) so the backend never needs an on-chain
/// counter kept in sync with Postgres.
///
/// The backend's server wallet is the sole `minter` — it calls `buyChunk`
/// only after its own off-chain KYC/payment checks pass. On-chain, atomicity
/// is enforced by Solidity itself: `buyChunk` either fully succeeds or fully
/// reverts, so two buyers racing for the same last square feet can never
/// both succeed, exactly the "no double-sale" guarantee the demo highlights.
contract PropertyToken is ERC1155, Ownable {
    /// @notice Total sellable sqft for a property, set once at tokenization.
    mapping(uint256 => uint256) public totalSupplyCap;

    /// @notice Sqft minted (sold) so far for a property.
    mapping(uint256 => uint256) public mintedSupply;

    /// @notice Whether a property has been tokenized yet.
    mapping(uint256 => bool) public tokenized;

    /// @notice The single address authorized to tokenize properties and mint
    /// purchases — MyAcre's backend server wallet.
    address public minter;

    event PropertyTokenized(uint256 indexed propertyId, uint256 totalSqFt);
    event ChunkPurchased(uint256 indexed propertyId, address indexed buyer, uint256 sqFt);
    event MinterUpdated(address indexed previousMinter, address indexed newMinter);

    modifier onlyMinter() {
        require(msg.sender == minter, "PropertyToken: caller is not the minter");
        _;
    }

    constructor(address initialMinter) ERC1155("") Ownable(msg.sender) {
        require(initialMinter != address(0), "PropertyToken: zero minter");
        minter = initialMinter;
    }

    /// @notice Registers a property's total sellable sqft on-chain. Called
    /// once, right after the off-chain oracle title check verifies a listing.
    function tokenizeProperty(uint256 propertyId, uint256 totalSqFt) external onlyMinter {
        require(!tokenized[propertyId], "PropertyToken: already tokenized");
        require(totalSqFt > 0, "PropertyToken: totalSqFt must be positive");
        tokenized[propertyId] = true;
        totalSupplyCap[propertyId] = totalSqFt;
        emit PropertyTokenized(propertyId, totalSqFt);
    }

    /// @notice Mints `sqFt` units of `propertyId` to `buyer`. Reverts if that
    /// would exceed the property's total sellable sqft — the on-chain
    /// double-sale guard.
    function buyChunk(uint256 propertyId, address buyer, uint256 sqFt) external onlyMinter {
        require(tokenized[propertyId], "PropertyToken: property not tokenized");
        require(sqFt > 0, "PropertyToken: sqFt must be positive");
        require(
            mintedSupply[propertyId] + sqFt <= totalSupplyCap[propertyId],
            "PropertyToken: exceeds available supply"
        );
        mintedSupply[propertyId] += sqFt;
        _mint(buyer, propertyId, sqFt, "");
        emit ChunkPurchased(propertyId, buyer, sqFt);
    }

    /// @notice Sqft still available to sell for a property.
    function availableSupply(uint256 propertyId) external view returns (uint256) {
        return totalSupplyCap[propertyId] - mintedSupply[propertyId];
    }

    /// @notice Rotates the authorized minter (e.g. if the backend's server
    /// wallet key is rotated). Contract owner only.
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "PropertyToken: zero minter");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }
}
