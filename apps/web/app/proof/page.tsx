"use client";

import { useEffect, useMemo, useState } from "react";
import { FileCheck2, RefreshCcw } from "lucide-react";
import { deployments, formatAddress, type NetworkKey } from "../../lib/deployments";

interface IndexedEvent {
  type: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: number;
  vault?: string;
  proposalId?: string;
  reason?: string;
  status?: number;
}

export default function ProofPage() {
  const [network, setNetwork] = useState<NetworkKey>("arbitrumSepolia");
  const [events, setEvents] = useState<IndexedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const latest = useMemo(() => [...events].reverse().slice(0, 8), [events]);

  async function loadEvents(nextNetwork = network) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/events?network=${nextNetwork}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load events");
      setEvents(payload.events);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents(network);
  }, [network]);

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">
            <FileCheck2 size={16} /> Onchain proof
          </p>
          <h1>Receipts and routing events.</h1>
          <p>
            This page calls the internal Next API, indexes the deployed contracts,
            and displays live Covenant events from the selected chain.
          </p>
        </div>
        <button className="button ghost" onClick={() => void loadEvents()}>
          <RefreshCcw size={18} /> Refresh
        </button>
      </section>

      <section className="console-grid">
        <div className="console-panel">
          <div className="panel-title">
            <h2>Network</h2>
            <span className="pill">{events.length} events</span>
          </div>
          <div className="network-tabs">
            {(Object.keys(deployments) as NetworkKey[]).map((key) => (
              <button
                className={`network-tab ${network === key ? "active" : ""}`}
                key={key}
                onClick={() => setNetwork(key)}
              >
                {key === "arbitrumSepolia" ? "Arbitrum Sepolia" : "Mantle Sepolia"}
              </button>
            ))}
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span>Factory</span>
              <strong title={deployments[network].contracts.covenantFactory}>
                {formatAddress(deployments[network].contracts.covenantFactory)}
              </strong>
            </div>
            <div className="stat">
              <span>Start block</span>
              <strong>{deployments[network].startBlock}</strong>
            </div>
          </div>
        </div>

        <div className="table-panel">
          <div className="panel-title">
            <h2>Latest events</h2>
            <span className="pill">{loading ? "indexing" : "live"}</span>
          </div>
          {error ? <div className="empty-state">{error}</div> : null}
          {!error && latest.length === 0 ? (
            <div className="empty-state">{loading ? "Loading events..." : "No events indexed yet."}</div>
          ) : null}
          <div className="event-list">
            {latest.map((event) => (
              <article className="event-row" key={`${event.transactionHash}-${event.logIndex}`}>
                <div>
                  <strong>{event.type}</strong>
                  <span>
                    {event.reason ? `${event.reason} ` : ""}
                    {event.vault ? `vault ${formatAddress(event.vault)}` : "network event"}
                  </span>
                  <span>tx {formatAddress(event.transactionHash)}</span>
                </div>
                <div>
                  <code>{event.proposalId ?? event.status ?? event.logIndex}</code>
                  <span>block {event.blockNumber}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
