// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20Minimal} from "./IERC20Minimal.sol";

contract CovenantVault {
    address public immutable owner;
    address public immutable router;
    uint256 public immutable policyId;
    bool public paused;

    mapping(address executor => bool) public authorizedExecutor;

    event ExecutorSet(address indexed executor, bool allowed);
    event PausedSet(bool paused);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event RoutedTransfer(address indexed token, address indexed to, uint256 amount);

    error NotOwner();
    error NotRouter();
    error Paused();
    error InvalidAddress();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner, address initialRouter, uint256 initialPolicyId) {
        if (initialOwner == address(0) || initialRouter == address(0)) revert InvalidAddress();
        owner = initialOwner;
        router = initialRouter;
        policyId = initialPolicyId;
    }

    function setExecutor(address executor, bool allowed) external onlyOwner {
        authorizedExecutor[executor] = allowed;
        emit ExecutorSet(executor, allowed);
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
        emit PausedSet(nextPaused);
    }

    function deposit(address token, uint256 amount) external {
        if (paused) revert Paused();
        if (!IERC20Minimal(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Deposited(token, msg.sender, amount);
    }

    function routeTransfer(address token, address to, uint256 amount) external {
        if (msg.sender != router) revert NotRouter();
        if (paused) revert Paused();
        if (!IERC20Minimal(token).transfer(to, amount)) revert TransferFailed();
        emit RoutedTransfer(token, to, amount);
    }
}

