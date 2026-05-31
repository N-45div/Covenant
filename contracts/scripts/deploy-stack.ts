import { network } from "hardhat";
import { defaultDeploymentPath, deployCovenantStack } from "./deploy-lib.js";

const requestedNetwork = process.env.COVENANT_NETWORK;
const networkName = requestedNetwork ?? "hardhat";
const outputPath = process.env.COVENANT_DEPLOYMENT_OUT ?? defaultDeploymentPath(networkName);
const connection = requestedNetwork ? await network.create(requestedNetwork) : await network.create();

const deployment = await deployCovenantStack(connection.viem, networkName, outputPath);

console.log(JSON.stringify(deployment, null, 2));
