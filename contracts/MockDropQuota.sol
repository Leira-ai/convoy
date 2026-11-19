// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Counter test double for the "kuota" adapter pattern
///         (Stage 3 data calibration). Mirrors the read surface of
///         the Agent ID gated mint family Convoy meets in the field:
///         a per-address quota read (quotaOf), a per-address usage
///         read (mintedBy), a global minted counter (totalMinted),
///         and a global cap (maxSupply). It deliberately has NO
///         totalSupply, so the adapter's pattern detection must take
///         the quota branch and source the global count from
///         totalMinted.
///
///         Ground truth is driven only by mintForTest, whose inputs
///         the calibration script records independently; the adapter
///         reads are then compared against those records. This is a
///         testnet test double, not a mint contract: mintForTest is
///         permissionless by design and moves no funds or tokens.
contract MockDropQuota {
    uint256 public immutable quotaPerAddress;
    uint256 public immutable supplyCap;

    uint256 private _totalMinted;
    mapping(address => uint256) private _mintedBy;

    constructor(uint256 quotaPerAddress_, uint256 supplyCap_) {
        require(supplyCap_ > 0, "cap");
        quotaPerAddress = quotaPerAddress_;
        supplyCap = supplyCap_;
    }

    /// @notice Test knob: record n mints for `to`, respecting both the
    ///         per-address quota and the global cap, exactly like the
    ///         gated mints this double stands in for.
    function mintForTest(address to, uint256 n) external {
        require(_mintedBy[to] + n <= quotaPerAddress, "quota exceeded");
        require(_totalMinted + n <= supplyCap, "cap exceeded");
        _mintedBy[to] += n;
        _totalMinted += n;
    }

    // --- Adapter-facing reads (the kuota pattern surface) ---

    function quotaOf(address account) external view returns (uint256) {
        // The gated-mint pattern this mirrors returns the same total
        // quota for every holder address.
        if (account == address(0)) return 0;
        return quotaPerAddress;
    }

    function mintedBy(address account) external view returns (uint256) {
        return _mintedBy[account];
    }

    function totalMinted() external view returns (uint256) {
        return _totalMinted;
    }

    function maxSupply() external view returns (uint256) {
        return supplyCap;
    }
}
