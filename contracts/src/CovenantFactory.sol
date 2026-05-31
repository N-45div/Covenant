// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CovenantTypes} from "./CovenantTypes.sol";
import {CovenantVault} from "./CovenantVault.sol";
import {PolicyEngine} from "./PolicyEngine.sol";

contract CovenantFactory {
    PolicyEngine public immutable policyEngine;
    address public immutable router;

    mapping(address owner => address[] vaults) private _vaultsByOwner;

    event CovenantCreated(
        address indexed owner,
        address indexed vault,
        uint256 indexed policyId,
        address initialExecutor
    );

    constructor(PolicyEngine initialPolicyEngine, address initialRouter) {
        policyEngine = initialPolicyEngine;
        router = initialRouter;
    }

    function createCovenant(
        CovenantTypes.PolicyParams calldata params,
        address initialExecutor
    ) external returns (uint256 policyId, address vault) {
        policyId = policyEngine.createPolicyFor(msg.sender, router, params);

        vault = address(new CovenantVault(msg.sender, router, policyId, initialExecutor));
        _vaultsByOwner[msg.sender].push(vault);
        emit CovenantCreated(msg.sender, vault, policyId, initialExecutor);
    }

    function vaultCount(address owner) external view returns (uint256) {
        return _vaultsByOwner[owner].length;
    }

    function vaultOf(address owner, uint256 index) external view returns (address) {
        return _vaultsByOwner[owner][index];
    }
}
