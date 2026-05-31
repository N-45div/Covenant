// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CovenantReceipt} from "./CovenantReceipt.sol";
import {CovenantTypes} from "./CovenantTypes.sol";
import {CovenantVault} from "./CovenantVault.sol";
import {PolicyEngine} from "./PolicyEngine.sol";

contract ActionRouter {
    enum Status {
        Unknown,
        Rejected,
        Queued,
        Executed
    }

    PolicyEngine public immutable policyEngine;
    CovenantReceipt public immutable receipt;
    uint256 public nextProposalId = 1;

    mapping(uint256 proposalId => CovenantTypes.RoutedAction) private _actions;
    mapping(uint256 proposalId => Status) public statusOf;

    event ProposalRouted(uint256 indexed proposalId, address indexed vault, address indexed executor, Status status);
    event QueuedProposalApproved(uint256 indexed proposalId, address indexed approver);

    error UnauthorizedExecutor();
    error InvalidActor();
    error NotVaultOwner();
    error ProposalNotQueued();

    constructor(PolicyEngine initialPolicyEngine, CovenantReceipt initialReceipt) {
        policyEngine = initialPolicyEngine;
        receipt = initialReceipt;
    }

    function propose(
        address vaultAddress,
        address recipient,
        CovenantTypes.ActionProposal calldata proposal
    ) external returns (uint256 proposalId) {
        CovenantVault vault = CovenantVault(vaultAddress);
        if (!vault.authorizedExecutor(msg.sender)) revert UnauthorizedExecutor();
        if (proposal.actor != msg.sender) revert InvalidActor();

        proposalId = nextProposalId++;
        CovenantTypes.Decision memory decision = policyEngine.validate(vault.policyId(), proposal);
        _actions[proposalId] = CovenantTypes.RoutedAction({
            policyId: vault.policyId(),
            vault: vaultAddress,
            executor: msg.sender,
            recipient: recipient,
            proposal: proposal
        });

        if (decision.verdict == CovenantTypes.Verdict.Approved) {
            policyEngine.recordExecution(vault.policyId(), proposal);
            vault.routeTransfer(proposal.inputAsset, recipient, proposal.amountIn);
            statusOf[proposalId] = Status.Executed;
        } else if (decision.verdict == CovenantTypes.Verdict.NeedsHumanApproval) {
            statusOf[proposalId] = Status.Queued;
        } else {
            statusOf[proposalId] = Status.Rejected;
        }

        receipt.issue(proposalId, vaultAddress, msg.sender, decision);
        emit ProposalRouted(proposalId, vaultAddress, msg.sender, statusOf[proposalId]);
    }

    function approveQueued(uint256 proposalId) external {
        CovenantTypes.RoutedAction memory action = _actions[proposalId];
        CovenantVault vault = CovenantVault(action.vault);
        if (msg.sender != vault.owner()) revert NotVaultOwner();
        if (statusOf[proposalId] != Status.Queued) revert ProposalNotQueued();

        policyEngine.recordExecution(action.policyId, action.proposal);
        vault.routeTransfer(action.proposal.inputAsset, action.recipient, action.proposal.amountIn);
        statusOf[proposalId] = Status.Executed;

        emit QueuedProposalApproved(proposalId, msg.sender);
    }
}

