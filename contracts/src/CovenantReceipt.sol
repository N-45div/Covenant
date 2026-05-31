// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CovenantTypes} from "./CovenantTypes.sol";

contract CovenantReceipt {
    address public router;

    event ReceiptIssued(
        uint256 indexed proposalId,
        address indexed vault,
        address indexed executor,
        CovenantTypes.Verdict verdict,
        CovenantTypes.RejectCode code,
        string reason
    );

    error NotRouter();

    constructor(address initialRouter) {
        router = initialRouter;
    }

    function setRouter(address nextRouter) external {
        if (router != address(0) && msg.sender != router) revert NotRouter();
        router = nextRouter;
    }

    function issue(
        uint256 proposalId,
        address vault,
        address executor,
        CovenantTypes.Decision calldata decision
    ) external {
        if (msg.sender != router) revert NotRouter();
        emit ReceiptIssued(proposalId, vault, executor, decision.verdict, decision.code, decision.reason);
    }
}

