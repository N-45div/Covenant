// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CovenantTypes} from "./CovenantTypes.sol";

contract PolicyEngine {
    uint16 public constant MAX_BPS = 10_000;
    uint256 public constant MAX_ASSETS = 64;
    uint256 public constant MAX_ACTIONS = 64;

    uint256 public nextPolicyId = 1;

    mapping(uint256 policyId => CovenantTypes.PolicyConfig) private _policies;
    mapping(uint256 policyId => mapping(address asset => bool)) public allowedInputAsset;
    mapping(uint256 policyId => mapping(address asset => bool)) public allowedOutputAsset;
    mapping(uint256 policyId => mapping(bytes4 action => uint256 amountCap)) public actionAmountCap;
    mapping(uint256 policyId => mapping(address actor => mapping(bytes4 action => uint64 timestamp))) public lastActionAt;
    mapping(uint256 policyId => mapping(address recorder => bool)) public executionRecorder;

    event PolicyCreated(uint256 indexed policyId, address indexed owner);
    event PolicyActiveSet(uint256 indexed policyId, bool active);
    event PolicyTimingUpdated(uint256 indexed policyId, uint64 expiresAt, uint64 cooldownSeconds);
    event PolicyThresholdsUpdated(uint256 indexed policyId, uint16 minOutputBps, uint256 humanApprovalThreshold);
    event ExecutionRecorderSet(uint256 indexed policyId, address indexed recorder, bool allowed);
    event ActionRecorded(uint256 indexed policyId, address indexed actor, bytes4 indexed action, uint64 timestamp);

    error ArrayRequired();
    error ArrayTooLarge();
    error InvalidAsset();
    error InvalidAction();
    error InvalidAmountCap();
    error InvalidBps();
    error InvalidExpiry();
    error PolicyNotFound();
    error NotPolicyOwner();
    error NotExecutionRecorder();
    error NotApproved(CovenantTypes.RejectCode code);

    modifier onlyPolicyOwner(uint256 policyId) {
        if (_policies[policyId].owner == address(0)) revert PolicyNotFound();
        if (_policies[policyId].owner != msg.sender) revert NotPolicyOwner();
        _;
    }

    function createPolicy(
        address[] calldata inputAssets,
        address[] calldata outputAssets,
        CovenantTypes.ActionLimit[] calldata actionLimits,
        uint16 minOutputBps,
        uint64 expiresAt,
        uint64 cooldownSeconds,
        uint256 humanApprovalThreshold
    ) external returns (uint256 policyId) {
        _validatePolicyShape(inputAssets, outputAssets, actionLimits, minOutputBps, expiresAt);

        policyId = nextPolicyId++;
        CovenantTypes.PolicyConfig storage config = _policies[policyId];
        config.owner = msg.sender;
        config.active = true;
        config.expiresAt = expiresAt;
        config.cooldownSeconds = cooldownSeconds;
        config.minOutputBps = minOutputBps;
        config.humanApprovalThreshold = humanApprovalThreshold;

        for (uint256 i; i < inputAssets.length; ++i) {
            allowedInputAsset[policyId][inputAssets[i]] = true;
        }
        for (uint256 i; i < outputAssets.length; ++i) {
            allowedOutputAsset[policyId][outputAssets[i]] = true;
        }
        for (uint256 i; i < actionLimits.length; ++i) {
            actionAmountCap[policyId][actionLimits[i].action] = actionLimits[i].amountCap;
        }

        emit PolicyCreated(policyId, msg.sender);
    }

    function policy(uint256 policyId) external view returns (CovenantTypes.PolicyConfig memory) {
        CovenantTypes.PolicyConfig memory config = _policies[policyId];
        if (config.owner == address(0)) revert PolicyNotFound();
        return config;
    }

    function setPolicyActive(uint256 policyId, bool active) external onlyPolicyOwner(policyId) {
        _policies[policyId].active = active;
        emit PolicyActiveSet(policyId, active);
    }

    function setPolicyTiming(uint256 policyId, uint64 expiresAt, uint64 cooldownSeconds) external onlyPolicyOwner(policyId) {
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();
        _policies[policyId].expiresAt = expiresAt;
        _policies[policyId].cooldownSeconds = cooldownSeconds;
        emit PolicyTimingUpdated(policyId, expiresAt, cooldownSeconds);
    }

    function setPolicyThresholds(
        uint256 policyId,
        uint16 minOutputBps,
        uint256 humanApprovalThreshold
    ) external onlyPolicyOwner(policyId) {
        if (minOutputBps > MAX_BPS) revert InvalidBps();
        _policies[policyId].minOutputBps = minOutputBps;
        _policies[policyId].humanApprovalThreshold = humanApprovalThreshold;
        emit PolicyThresholdsUpdated(policyId, minOutputBps, humanApprovalThreshold);
    }

    function setExecutionRecorder(uint256 policyId, address recorder, bool allowed) external onlyPolicyOwner(policyId) {
        executionRecorder[policyId][recorder] = allowed;
        emit ExecutionRecorderSet(policyId, recorder, allowed);
    }

    function validate(
        uint256 policyId,
        CovenantTypes.ActionProposal calldata proposal
    ) public view returns (CovenantTypes.Decision memory) {
        CovenantTypes.PolicyConfig memory config = _policies[policyId];
        if (config.owner == address(0)) revert PolicyNotFound();

        if (!config.active) {
            return _rejected(CovenantTypes.RejectCode.PolicyInactive, "POLICY_INACTIVE");
        }
        if (config.expiresAt != 0 && block.timestamp > config.expiresAt) {
            return _rejected(CovenantTypes.RejectCode.PolicyExpired, "POLICY_EXPIRED");
        }
        if (proposal.deadline != 0 && block.timestamp > proposal.deadline) {
            return _rejected(CovenantTypes.RejectCode.ProposalExpired, "PROPOSAL_EXPIRED");
        }
        if (!allowedInputAsset[policyId][proposal.inputAsset]) {
            return _rejected(CovenantTypes.RejectCode.InputAssetNotAllowed, "INPUT_ASSET_NOT_ALLOWED");
        }
        if (!allowedOutputAsset[policyId][proposal.outputAsset]) {
            return _rejected(CovenantTypes.RejectCode.OutputAssetNotAllowed, "OUTPUT_ASSET_NOT_ALLOWED");
        }

        uint256 cap = actionAmountCap[policyId][proposal.action];
        if (cap == 0 || proposal.amountIn > cap) {
            return _rejected(CovenantTypes.RejectCode.AmountCapExceeded, "AMOUNT_CAP_EXCEEDED");
        }
        if (_coolingDown(config.cooldownSeconds, lastActionAt[policyId][proposal.actor][proposal.action])) {
            return _rejected(CovenantTypes.RejectCode.CooldownActive, "COOLDOWN_ACTIVE");
        }
        if (!_meetsMinimumOutput(proposal.minAmountOut, proposal.quotedAmountOut, config.minOutputBps)) {
            return _rejected(CovenantTypes.RejectCode.SlippageTooHigh, "SLIPPAGE_TOO_HIGH");
        }
        if (config.humanApprovalThreshold != 0 && proposal.amountIn >= config.humanApprovalThreshold) {
            return CovenantTypes.Decision({
                verdict: CovenantTypes.Verdict.NeedsHumanApproval,
                code: CovenantTypes.RejectCode.HumanApprovalRequired,
                reason: "HUMAN_APPROVAL_REQUIRED"
            });
        }

        return CovenantTypes.Decision({
            verdict: CovenantTypes.Verdict.Approved,
            code: CovenantTypes.RejectCode.None,
            reason: "APPROVED"
        });
    }

    function recordExecution(uint256 policyId, CovenantTypes.ActionProposal calldata proposal) external {
        if (_policies[policyId].owner == address(0)) revert PolicyNotFound();
        if (_policies[policyId].owner != msg.sender && !executionRecorder[policyId][msg.sender]) {
            revert NotExecutionRecorder();
        }

        CovenantTypes.Decision memory decision = validate(policyId, proposal);
        if (decision.verdict == CovenantTypes.Verdict.Rejected) revert NotApproved(decision.code);

        uint64 timestamp = uint64(block.timestamp);
        lastActionAt[policyId][proposal.actor][proposal.action] = timestamp;
        emit ActionRecorded(policyId, proposal.actor, proposal.action, timestamp);
    }

    function _validatePolicyShape(
        address[] calldata inputAssets,
        address[] calldata outputAssets,
        CovenantTypes.ActionLimit[] calldata actionLimits,
        uint16 minOutputBps,
        uint64 expiresAt
    ) private view {
        if (inputAssets.length == 0 || outputAssets.length == 0 || actionLimits.length == 0) revert ArrayRequired();
        if (inputAssets.length > MAX_ASSETS || outputAssets.length > MAX_ASSETS || actionLimits.length > MAX_ACTIONS) {
            revert ArrayTooLarge();
        }
        if (minOutputBps > MAX_BPS) revert InvalidBps();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();

        for (uint256 i; i < inputAssets.length; ++i) {
            if (inputAssets[i] == address(0)) revert InvalidAsset();
        }
        for (uint256 i; i < outputAssets.length; ++i) {
            if (outputAssets[i] == address(0)) revert InvalidAsset();
        }
        for (uint256 i; i < actionLimits.length; ++i) {
            if (actionLimits[i].action == bytes4(0)) revert InvalidAction();
            if (actionLimits[i].amountCap == 0) revert InvalidAmountCap();
        }
    }

    function _coolingDown(uint64 cooldownSeconds, uint64 lastActionTimestamp) private view returns (bool) {
        return cooldownSeconds != 0
            && lastActionTimestamp != 0
            && block.timestamp < uint256(lastActionTimestamp) + cooldownSeconds;
    }

    function _meetsMinimumOutput(uint256 minAmountOut, uint256 quotedAmountOut, uint16 minOutputBps) private pure returns (bool) {
        if (quotedAmountOut == 0) return minAmountOut == 0;
        return minAmountOut * MAX_BPS >= quotedAmountOut * minOutputBps;
    }

    function _rejected(
        CovenantTypes.RejectCode code,
        string memory reason
    ) private pure returns (CovenantTypes.Decision memory) {
        return CovenantTypes.Decision({verdict: CovenantTypes.Verdict.Rejected, code: code, reason: reason});
    }
}
