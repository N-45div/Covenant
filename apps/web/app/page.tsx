import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Blocks,
  Bot,
  FileCheck2,
  LockKeyhole,
  Route,
  ShieldCheck
} from "lucide-react";
import { deployments, formatAddress, formatTokenAmount } from "../lib/deployments";

const chainRows = [
  { name: "Arbitrum Sepolia", data: deployments.arbitrumSepolia },
  { name: "Mantle Sepolia", data: deployments.mantleSepolia }
];

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <BadgeCheck size={16} /> Live on Arbitrum and Mantle testnets
          </p>
          <h1>Covenant</h1>
          <p className="hero-lede">
            Programmable guardrails for agentic tokenized finance. Agents propose
            actions, Covenant enforces policy onchain, and every decision becomes
            auditable proof.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/dashboard">
              Launch Console <ArrowRight size={18} />
            </Link>
            <Link className="button ghost" href="/proof">
              Inspect Proof <FileCheck2 size={18} />
            </Link>
          </div>
          <div className="proof-strip" aria-label="Deployment summary">
            <div className="proof-tile">
              <strong>2</strong>
              <span>deployed networks</span>
            </div>
            <div className="proof-tile">
              <strong>{formatTokenAmount(deployments.arbitrumSepolia.demo.perActionCap)}</strong>
              <span>token per-action cap</span>
            </div>
            <div className="proof-tile">
              <strong>Public</strong>
              <span>self-service covenant creation</span>
            </div>
          </div>
        </div>

        <div className="scene" aria-hidden="true">
          <div className="scene-grid" />
          <div className="scene-line one" />
          <div className="scene-line two" />
          <div className="scene-line three" />
          <div className="scene-node agent">
            <header>
              <b>Agent proposal</b>
              <span className="status">
                <span className="status-dot" /> structured
              </span>
            </header>
            <div className="metric-row">
              <span>Action</span>
              <strong>rebalance</strong>
            </div>
            <div className="metric-row">
              <span>Actor</span>
              <strong>executor wallet</strong>
            </div>
          </div>
          <div className="scene-node policy">
            <header>
              <b>Policy engine</b>
              <span className="status">
                <span className="status-dot" /> enforcing
              </span>
            </header>
            <div className="metric-row">
              <span>Cap</span>
              <strong>{formatTokenAmount(deployments.mantleSepolia.demo.perActionCap)}</strong>
            </div>
            <div className="metric-row">
              <span>Human threshold</span>
              <strong>{formatTokenAmount(deployments.mantleSepolia.demo.humanApprovalThreshold)}</strong>
            </div>
          </div>
          <div className="scene-node receipt">
            <header>
              <b>Receipt issued</b>
              <span className="status">
                <span className="status-dot" /> verifiable
              </span>
            </header>
            <div className="metric-row">
              <span>Decision</span>
              <strong>approved / queued / rejected</strong>
            </div>
            <div className="metric-row">
              <span>Proof</span>
              <strong>onchain event</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Built for financial agents that need hard limits, not trust.</h2>
          <p>
            Covenant turns safety into a programmable asset layer: caps, allowed
            actions, human approval thresholds, routing, receipts, and chain-level
            history.
          </p>
        </div>
        <div className="value-grid">
          <article className="value-card">
            <Bot size={28} />
            <h3>Agent-ready execution</h3>
            <p>
              Wallets and agents can submit structured proposals while the vault
              keeps custody behind policy checks.
            </p>
          </article>
          <article className="value-card">
            <LockKeyhole size={28} />
            <h3>Onchain enforcement</h3>
            <p>
              Rules are evaluated by contracts before assets move. Risky actions
              queue for humans instead of relying on offchain promises.
            </p>
          </article>
          <article className="value-card">
            <Activity size={28} />
            <h3>Proof-first UX</h3>
            <p>
              Every approval, rejection, and receipt can be inspected from the
              interface and matched to deployed contracts.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Deployment surface</h2>
          <p>Shared infrastructure is live. Any wallet can create its own covenant.</p>
        </div>
        <div className="chain-grid">
          {chainRows.map((row) => (
            <article className="chain-panel" key={row.name}>
              <h3>
                <Blocks size={18} /> {row.name}
              </h3>
              <div className="address-list">
                <div className="address-row">
                  <span>Factory</span>
                  <code title={row.data.contracts.covenantFactory}>
                    {formatAddress(row.data.contracts.covenantFactory)}
                  </code>
                </div>
                <div className="address-row">
                  <span>Router</span>
                  <code title={row.data.contracts.actionRouter}>
                    {formatAddress(row.data.contracts.actionRouter)}
                  </code>
                </div>
                <div className="address-row">
                  <span>Receipt</span>
                  <code title={row.data.contracts.covenantReceipt}>
                    {formatAddress(row.data.contracts.covenantReceipt)}
                  </code>
                </div>
                <div className="address-row">
                  <span>Demo vault</span>
                  <code title={row.data.contracts.covenantVault}>
                    {formatAddress(row.data.contracts.covenantVault)}
                  </code>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Product path</h2>
          <p>
            Create a policy, fund a vault, let an agent propose, and verify the
            receipt after execution.
          </p>
        </div>
        <div className="value-grid">
          <article className="value-card">
            <ShieldCheck size={28} />
            <h3>1. Create covenant</h3>
            <p>Pick caps, approvals, allowed assets, and an initial executor.</p>
          </article>
          <article className="value-card">
            <Route size={28} />
            <h3>2. Route action</h3>
            <p>Submit a transaction request through the ActionRouter.</p>
          </article>
          <article className="value-card">
            <FileCheck2 size={28} />
            <h3>3. Verify outcome</h3>
            <p>Read the receipt and timeline against the selected chain.</p>
          </article>
        </div>
      </section>
    </>
  );
}
