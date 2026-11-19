// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAgentID.sol";

/// @title ConvoySignal
/// @notice Queue signals for Agent ID gated drops. Only Agent ID holders
///         can signal, one active signal per holder per drop, enforced
///         on-chain against the Agent ID registry. The resulting queue
///         length is a count of real people, because an Agent ID is
///         soulbound and cannot be duplicated per person.
/// @dev The contract holds no funds (no payable function exists), has no
///      owner and no admin surface: nobody can edit, remove or forge
///      another account's signal. The registry address is immutable.
contract ConvoySignal {
    /// @notice The Agent ID registry this contract gates signals against.
    IAgentID public immutable agentID;

    struct Drop {
        address dropContract;
        uint64 opensAt;
        uint64 closesAt;
        string label;
        address registrar;
        uint256 signalCount;
        bool exists;
    }

    uint256 public dropCount;
    mapping(uint256 => Drop) private _drops;
    mapping(uint256 => mapping(address => bool)) private _signaled;

    event DropRegistered(
        uint256 indexed dropId,
        address indexed dropContract,
        uint64 opensAt,
        uint64 closesAt,
        string label,
        address indexed registrar
    );
    event Signaled(uint256 indexed dropId, address indexed account);
    event SignalWithdrawn(uint256 indexed dropId, address indexed account);

    error InvalidRegistry();
    error InvalidDropContract();
    error InvalidWindow();
    error DropNotFound(uint256 dropId);
    error NotAgentIDHolder(address account);
    error AlreadySignaled(uint256 dropId, address account);
    error NotSignaled(uint256 dropId, address account);

    constructor(address registry_) {
        if (registry_ == address(0)) revert InvalidRegistry();
        agentID = IAgentID(registry_);
    }

    /// @notice Register a drop to track. Open to anyone, including the
    ///         project itself. Registration alone carries no demand:
    ///         only holder signals count, so a junk registration shows
    ///         up as a drop with an empty queue.
    /// @param dropContract Address of the gated drop or project contract.
    /// @param opensAt Unix open time, or 0 when not yet announced.
    /// @param closesAt Unix close time, or 0 when unknown. When set, it
    ///        must be later than opensAt.
    /// @param label Display label (project name and phase).
    function registerDrop(address dropContract, uint64 opensAt, uint64 closesAt, string calldata label)
        external
        returns (uint256 dropId)
    {
        if (dropContract == address(0)) revert InvalidDropContract();
        if (closesAt != 0 && closesAt <= opensAt) revert InvalidWindow();
        dropId = dropCount++;
        Drop storage d = _drops[dropId];
        d.dropContract = dropContract;
        d.opensAt = opensAt;
        d.closesAt = closesAt;
        d.label = label;
        d.registrar = msg.sender;
        d.exists = true;
        emit DropRegistered(dropId, dropContract, opensAt, closesAt, label, msg.sender);
    }

    /// @notice Signal "I am queueing for this drop" as the caller. The
    ///         caller must hold an Agent ID, and can hold at most one
    ///         active signal per drop. A signal is always recorded for
    ///         msg.sender; there is no way to signal for someone else.
    function signal(uint256 dropId) external {
        Drop storage d = _drops[dropId];
        if (!d.exists) revert DropNotFound(dropId);
        if (agentID.balanceOf(msg.sender) == 0) revert NotAgentIDHolder(msg.sender);
        if (_signaled[dropId][msg.sender]) revert AlreadySignaled(dropId, msg.sender);
        _signaled[dropId][msg.sender] = true;
        d.signalCount += 1;
        emit Signaled(dropId, msg.sender);
    }

    /// @notice Withdraw the caller's own active signal on a drop. Not
    ///         gated on current holder status, so a signal can always
    ///         be cancelled by its owner.
    function withdrawSignal(uint256 dropId) external {
        Drop storage d = _drops[dropId];
        if (!d.exists) revert DropNotFound(dropId);
        if (!_signaled[dropId][msg.sender]) revert NotSignaled(dropId, msg.sender);
        _signaled[dropId][msg.sender] = false;
        d.signalCount -= 1;
        emit SignalWithdrawn(dropId, msg.sender);
    }

    /// @notice Number of active holder signals on a drop.
    function signalCountOf(uint256 dropId) external view returns (uint256) {
        Drop storage d = _drops[dropId];
        if (!d.exists) revert DropNotFound(dropId);
        return d.signalCount;
    }

    /// @notice Whether an account currently holds an active signal.
    function hasSignaled(uint256 dropId, address account) external view returns (bool) {
        return _signaled[dropId][account];
    }

    /// @notice Full stored record of a drop.
    function getDrop(uint256 dropId)
        external
        view
        returns (
            address dropContract,
            uint64 opensAt,
            uint64 closesAt,
            string memory label,
            address registrar,
            uint256 signalCount,
            bool exists
        )
    {
        Drop storage d = _drops[dropId];
        if (!d.exists) revert DropNotFound(dropId);
        return (d.dropContract, d.opensAt, d.closesAt, d.label, d.registrar, d.signalCount, d.exists);
    }
}
