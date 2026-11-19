// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Counter test double for the "suplai" adapter pattern
///         (Stage 3 data calibration). Mirrors the read surface of a
///         plain ERC-721 style drop: totalSupply for the minted count
///         and MAX_SUPPLY for the cap. It deliberately has NO
///         totalMinted, NO quotaOf, NO mintedBy, and NO maxSupply, so
///         the adapter's detection must fall through the quota branch
///         and source the cap from MAX_SUPPLY.
///
///         This is a counter double, not a full ERC-721: the adapter
///         only ever reads the two counters above, and those are what
///         this contract proves. Ground truth is the constructor's
///         initial supply plus every mintForTest input, recorded
///         independently by the calibration script.
contract MockDropSupply {
    uint256 private _supply;
    uint256 private immutable _maxSupply;

    constructor(uint256 initialSupply_, uint256 maxSupply_) {
        require(maxSupply_ > 0, "cap");
        require(initialSupply_ <= maxSupply_, "over cap");
        _supply = initialSupply_;
        _maxSupply = maxSupply_;
    }

    /// @notice Test knob: record n further mints, up to the cap.
    function mintForTest(uint256 n) external {
        require(_supply + n <= _maxSupply, "cap exceeded");
        _supply += n;
    }

    // --- Adapter-facing reads (the suplai pattern surface) ---

    function totalSupply() external view returns (uint256) {
        return _supply;
    }

    function MAX_SUPPLY() external view returns (uint256) {
        return _maxSupply;
    }
}
