// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library CovenantTypes {
    enum Verdict {
        Approved,
        Rejected,
        NeedsHumanApproval
    }

    enum RejectCode {
        None,
        PolicyInactive,
        PolicyExpired,
        ProposalExpired,
        CooldownActive,
        InputAssetNotAllowed,
        OutputAssetNotAllowed,
        AmountCapExceeded,
        SlippageTooHigh,
        HumanApprovalRequired
    }

    struct ActionLimit {
        bytes4 action;
        uint256 amountCap;
    }

    struct PolicyParams {
        address[] inputAssets;
        address[] outputAssets;
        ActionLimit[] actionLimits;
        uint16 minOutputBps;
        uint64 expiresAt;
        uint64 cooldownSeconds;
        uint256 humanApprovalThreshold;
    }

    struct PolicyConfig {
        address owner;
        bool active;
        uint64 expiresAt;
        uint64 cooldownSeconds;
        uint16 minOutputBps;
        uint256 humanApprovalThreshold;
    }

    struct ActionProposal {
        address actor;
        bytes4 action;
        address inputAsset;
        address outputAsset;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 quotedAmountOut;
        uint64 deadline;
    }

    struct RoutedAction {
        uint256 policyId;
        address vault;
        address executor;
        address recipient;
        ActionProposal proposal;
    }

    struct Decision {
        Verdict verdict;
        RejectCode code;
        string reason;
    }
}
