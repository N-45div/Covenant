import { ShieldCheck } from "lucide-react";
import { CovenantFlow } from "../../components/CovenantFlow";

export default function CreatePage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow"><ShieldCheck size={16} /> Public covenant creation</p>
          <h1>Create a guarded vault.</h1>
          <p>
            This flow uses the deployed factory from your selected chain. The
            connected wallet becomes the policy owner, vault owner, and initial
            executor.
          </p>
        </div>
      </section>
      <CovenantFlow />
    </>
  );
}
