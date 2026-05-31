import Link from "next/link";
import { ArrowRight, Gauge, Network, ShieldCheck } from "lucide-react";
import { deployments, formatAddress, formatTokenAmount } from "../../lib/deployments";

const rows = [
  { label: "Arbitrum Sepolia", data: deployments.arbitrumSepolia },
  { label: "Mantle Sepolia", data: deployments.mantleSepolia }
];

export default function DashboardPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">
            <Gauge size={16} /> Covenant console
          </p>
          <h1>Live policy infrastructure.</h1>
          <p>
            Shared factories, routers, receipts, and demo vaults are deployed on
            both target networks. The next routes use the same artifacts that the
            contracts deployed with.
          </p>
        </div>
        <Link className="button primary" href="/create">
          Create Covenant <ArrowRight size={18} />
        </Link>
      </section>

      <section className="console-grid">
        <div className="console-panel">
          <div className="panel-title">
            <h2>System status</h2>
            <span className="pill">2 networks</span>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span>Execution model</span>
              <strong>Agents propose</strong>
            </div>
            <div className="stat">
              <span>Enforcement model</span>
              <strong>Contracts decide</strong>
            </div>
            <div className="stat">
              <span>Per-action cap</span>
              <strong>{formatTokenAmount(deployments.arbitrumSepolia.demo.perActionCap)}</strong>
            </div>
            <div className="stat">
              <span>Approval threshold</span>
              <strong>{formatTokenAmount(deployments.arbitrumSepolia.demo.humanApprovalThreshold)}</strong>
            </div>
          </div>
        </div>

        <div className="table-panel">
          <div className="panel-title">
            <h2>Deployments</h2>
            <Link className="pill" href="/proof">
              inspect events <ArrowRight size={14} />
            </Link>
          </div>
          <div className="event-list">
            {rows.map((row) => (
              <article className="event-row" key={row.label}>
                <div>
                  <strong>
                    <Network size={15} /> {row.label}
                  </strong>
                  <span>Factory {formatAddress(row.data.contracts.covenantFactory)}</span>
                  <span>Router {formatAddress(row.data.contracts.actionRouter)}</span>
                </div>
                <div>
                  <code>{row.data.chainId}</code>
                  <span>chain id</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>General public access is built in.</h2>
          <p>
            The deployed factory creates a new policy and vault for the caller.
            The deployer is infrastructure owner only, not the only user.
          </p>
        </div>
        <div className="value-grid">
          <article className="value-card">
            <ShieldCheck size={28} />
            <h3>User-owned vault</h3>
            <p>Every created covenant stores the caller as policy owner and vault owner.</p>
          </article>
          <article className="value-card">
            <Gauge size={28} />
            <h3>Executor scoped</h3>
            <p>The creator chooses the first executor that can propose actions.</p>
          </article>
          <article className="value-card">
            <Network size={28} />
            <h3>Multi-chain target</h3>
            <p>The same product loop works across Arbitrum Sepolia and Mantle Sepolia.</p>
          </article>
        </div>
      </section>
    </>
  );
}
