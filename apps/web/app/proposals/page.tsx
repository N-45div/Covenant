import { Route } from "lucide-react";
import { CovenantFlow } from "../../components/CovenantFlow";

export default function ProposalsPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow"><Route size={16} /> Agent action routing</p>
          <h1>Propose actions through policy.</h1>
          <p>
            After a covenant is funded, submit an approved action or a larger
            action that must queue for human approval. The receipt appears on the
            proof page after the transaction lands.
          </p>
        </div>
      </section>
      <CovenantFlow />
    </>
  );
}
