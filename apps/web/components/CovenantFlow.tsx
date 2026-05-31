"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, custom, http, parseEther, type Address } from "viem";
import { CheckCircle2, Loader2, Send, Wallet } from "lucide-react";
import { deployments, formatAddress, type NetworkKey } from "../lib/deployments";
import { chains, factoryAbi, routerAbi, tokenAbi, vaultAbi } from "../lib/contracts";

type Step = { label: string; hash?: string };

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function CovenantFlow() {
  const [network, setNetwork] = useState<NetworkKey>("arbitrumSepolia");
  const [account, setAccount] = useState<Address>();
  const [vault, setVault] = useState<Address>();
  const [busy, setBusy] = useState("");
  const [amount, setAmount] = useState("100");
  const [steps, setSteps] = useState<Step[]>([]);
  const deployment = deployments[network];
  const chain = chains[network];

  async function connect() {
    if (!window.ethereum) throw new Error("Wallet not found");
    const [address] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
    setAccount(address);
  }

  async function ensureChain() {
    if (!window.ethereum) throw new Error("Wallet not found");
    const hexId = `0x${chain.id.toString(16)}`;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined
        }]
      });
    }
  }

  function clients() {
    if (!window.ethereum || !account) throw new Error("Connect wallet first");
    return {
      wallet: createWalletClient({ account, chain, transport: custom(window.ethereum) }),
      publicClient: createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) })
    };
  }

  function record(label: string, hash?: string) {
    setSteps((current) => [{ label, hash }, ...current].slice(0, 8));
  }

  async function createCovenant() {
    setBusy("Creating covenant");
    await ensureChain();
    if (!account) await connect();
    const activeAccount = account ?? ((await window.ethereum!.request({ method: "eth_requestAccounts" })) as Address[])[0];
    const { wallet, publicClient } = clientsFor(activeAccount);
    const hash = await wallet.writeContract({
      address: deployment.contracts.covenantFactory as Address,
      abi: factoryAbi,
      functionName: "createCovenant",
      args: [{
        inputAssets: [deployment.contracts.demoInputToken as Address],
        outputAssets: [deployment.contracts.demoOutputToken as Address],
        actionLimits: [{ action: deployment.demo.action as `0x${string}`, amountCap: BigInt(deployment.demo.perActionCap) }],
        minOutputBps: 9500,
        expiresAt: 0n,
        cooldownSeconds: 0n,
        humanApprovalThreshold: BigInt(deployment.demo.humanApprovalThreshold)
      }, activeAccount]
    });
    record("Create covenant submitted", hash);
    await publicClient.waitForTransactionReceipt({ hash });
    const count = await publicClient.readContract({
      address: deployment.contracts.covenantFactory as Address,
      abi: factoryAbi,
      functionName: "vaultCount",
      args: [activeAccount]
    });
    const nextVault = await publicClient.readContract({
      address: deployment.contracts.covenantFactory as Address,
      abi: factoryAbi,
      functionName: "vaultOf",
      args: [activeAccount, count - 1n]
    });
    setAccount(activeAccount);
    setVault(nextVault);
    record(`Vault ready ${formatAddress(nextVault)}`);
    setBusy("");
  }

  async function fundVault() {
    if (!vault) throw new Error("Create a covenant first");
    setBusy("Funding vault");
    await ensureChain();
    const { wallet, publicClient } = clients();
    const value = parseEther("1000");
    const mintHash = await wallet.writeContract({
      address: deployment.contracts.demoInputToken as Address,
      abi: tokenAbi,
      functionName: "mint",
      args: [account!, value]
    });
    record("Mint demo tokens", mintHash);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    const approveHash = await wallet.writeContract({
      address: deployment.contracts.demoInputToken as Address,
      abi: tokenAbi,
      functionName: "approve",
      args: [vault, value]
    });
    record("Approve vault deposit", approveHash);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const depositHash = await wallet.writeContract({
      address: vault,
      abi: vaultAbi,
      functionName: "deposit",
      args: [deployment.contracts.demoInputToken as Address, value]
    });
    record("Deposit into vault", depositHash);
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
    setBusy("");
  }

  async function propose(kind: "safe" | "queued") {
    if (!vault) throw new Error("Create and fund a covenant first");
    setBusy(kind === "safe" ? "Submitting safe proposal" : "Submitting approval proposal");
    await ensureChain();
    const { wallet, publicClient } = clients();
    const value = parseEther(kind === "safe" ? amount : "600");
    const hash = await wallet.writeContract({
      address: deployment.contracts.actionRouter as Address,
      abi: routerAbi,
      functionName: "propose",
      args: [vault, account!, {
        actor: account!,
        action: deployment.demo.action as `0x${string}`,
        inputAsset: deployment.contracts.demoInputToken as Address,
        outputAsset: deployment.contracts.demoOutputToken as Address,
        amountIn: value,
        minAmountOut: (value * 95n) / 100n,
        quotedAmountOut: value,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600)
      }]
    });
    record(kind === "safe" ? "Safe proposal routed" : "Human approval proposal queued", hash);
    await publicClient.waitForTransactionReceipt({ hash });
    setBusy("");
  }

  function clientsFor(activeAccount: Address) {
    if (!window.ethereum) throw new Error("Wallet not found");
    return {
      wallet: createWalletClient({ account: activeAccount, chain, transport: custom(window.ethereum) }),
      publicClient: createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) })
    };
  }

  async function run(label: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      record(error instanceof Error ? error.message : label);
      setBusy("");
    }
  }

  return (
    <div className="flow-grid">
      <div className="console-panel">
        <div className="panel-title">
          <h2>Wallet workflow</h2>
          <span className="pill">{account ? formatAddress(account) : "not connected"}</span>
        </div>
        <div className="network-tabs">
          {(Object.keys(deployments) as NetworkKey[]).map((key) => (
            <button className={`network-tab ${network === key ? "active" : ""}`} key={key} onClick={() => setNetwork(key)}>
              {key === "arbitrumSepolia" ? "Arbitrum" : "Mantle"}
            </button>
          ))}
        </div>
        <div className="form-stack">
          <button className="button ghost" onClick={() => void run("connect", connect)}>
            <Wallet size={18} /> Connect wallet
          </button>
          <button className="button primary" onClick={() => void run("create", createCovenant)} disabled={Boolean(busy)}>
            {busy === "Creating covenant" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />} Create covenant
          </button>
          <button className="button ghost" onClick={() => void run("fund", fundVault)} disabled={!vault || Boolean(busy)}>
            Fund vault
          </button>
          <label className="field">
            <span>Safe proposal amount</span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
          </label>
          <button className="button primary" onClick={() => void run("safe", () => propose("safe"))} disabled={!vault || Boolean(busy)}>
            <Send size={18} /> Submit safe proposal
          </button>
          <button className="button ghost" onClick={() => void run("queued", () => propose("queued"))} disabled={!vault || Boolean(busy)}>
            Queue human approval proposal
          </button>
        </div>
      </div>
      <div className="table-panel">
        <div className="panel-title">
          <h2>Run state</h2>
          <span className="pill">{busy || "ready"}</span>
        </div>
        <div className="stat-grid">
          <div className="stat"><span>Network</span><strong>{chain.name}</strong></div>
          <div className="stat"><span>Vault</span><strong>{vault ? formatAddress(vault) : "not created"}</strong></div>
          <div className="stat"><span>Factory</span><strong>{formatAddress(deployment.contracts.covenantFactory)}</strong></div>
          <div className="stat"><span>Router</span><strong>{formatAddress(deployment.contracts.actionRouter)}</strong></div>
        </div>
        <div className="event-list flow-events">
          {steps.length === 0 ? <div className="empty-state">Transactions will appear here.</div> : null}
          {steps.map((step, index) => (
            <article className="event-row" key={`${step.label}-${index}`}>
              <div>
                <strong>{step.label}</strong>
                {step.hash ? <span>tx {formatAddress(step.hash)}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
