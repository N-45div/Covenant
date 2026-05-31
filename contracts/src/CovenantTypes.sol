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

    struct Decision {
        Verdict verdict;
        RejectCode code;
        string reason;
    }
}
