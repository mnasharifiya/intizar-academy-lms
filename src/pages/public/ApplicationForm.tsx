import { useEffect, useState, type CSSProperties } from "react";
import { Button, Card, Input } from "../../components/common/ui";
import { C, APP_NAME } from "../../lib/theme";
import {
  listApplicationPrograms,
  submitApplication,
  submitPaymentProof,
  type ApplicationProgram,
  type ApplicationRecord,
} from "../../lib/applicationApi";

const emptyForm = {
  fullName: "",
  email: "",
  phoneNo: "",
  photo: "",
  zone: "",
  branch: "",
  workInBranch: "",
  programId: "",
};

const emptyProof = {
  applicationNo: "",
  email: "",
  payerName: "",
  bankName: "",
  transactionReference: "",
  paymentProof: "",
};

export default function ApplicationForm({
  onBackToLogin,
}: {
  onBackToLogin: () => void;
}) {
  const [programs, setPrograms] = useState<ApplicationProgram[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState(emptyProof);
  const [submitted, setSubmitted] = useState<ApplicationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"apply" | "proof">("apply");

  useEffect(() => {
    listApplicationPrograms()
      .then(setPrograms)
      .catch(err => alert(err?.message || "Could not load programs."));
  }, []);

  function readPhoto(file?: File) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      setForm(f => ({ ...f, photo: String(e.target?.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  function readProof(file?: File) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      setProof(f => ({ ...f, paymentProof: String(e.target?.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.fullName ||
      !form.email ||
      !form.phoneNo ||
      !form.photo ||
      !form.zone ||
      !form.branch ||
      !form.workInBranch ||
      !form.programId
    ) {
      alert("All application fields are required.");
      return;
    }

    const program = programs.find(p => p.id === form.programId);
    if (!program) {
      alert("Please select a valid program.");
      return;
    }

    try {
      setBusy(true);

      const app = await submitApplication({
        ...form,
        programName: program.name,
      });

      setSubmitted(app);
      setForm(emptyForm);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Application failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof(e: React.FormEvent) {
    e.preventDefault();

    if (
      !proof.applicationNo ||
      !proof.email ||
      !proof.payerName ||
      !proof.bankName ||
      !proof.transactionReference ||
      !proof.paymentProof
    ) {
      alert("All payment proof fields are required.");
      return;
    }

    try {
      setBusy(true);
      await submitPaymentProof(proof);
      setProof(emptyProof);
      alert("Payment proof submitted. Main Admin will verify it.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not submit payment proof.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={page}>
      <div style={hero}>
        <img src="/intizar-logo.jpg" alt="INTIZAR" style={logo} />
        <h1 style={title}>{APP_NAME} Application</h1>
        <p style={sub}>
          Apply for a program, generate your payment reference, and submit your payment proof.
        </p>

        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18}}>
          <Button variant={mode === "apply" ? undefined : "secondary"} onClick={() => setMode("apply")}>
            New Application
          </Button>
          <Button variant={mode === "proof" ? undefined : "secondary"} onClick={() => setMode("proof")}>
            Submit Payment Proof
          </Button>
          <Button variant="secondary" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </div>
      </div>

      <div style={content}>
        {submitted && (
          <Card>
            <h2 style={sectionTitle}>Application Submitted</h2>
            <p style={sectionSub}>Save these details carefully.</p>

            <div style={successGrid}>
              <Info label="Application No" value={submitted.applicationNo} />
              <Info label="Payment Reference" value={submitted.paymentReference} />
              <Info label="Amount" value={"₦" + submitted.applicationFee.toLocaleString()} />
              <Info label="Suggested Reg No" value={submitted.suggestedRegNo || "-"} />
            </div>

            <div style={payBox}>
              <strong>Payment Instruction</strong>
              <p>
                Pay ₦{submitted.applicationFee.toLocaleString()} to the official INTIZAR bank account.
                Use the payment reference above as your payment narration/reference.
              </p>
              <p style={{color:"#92400e",fontWeight:800}}>
                Bank account details should be given by INTIZAR management.
              </p>
            </div>

            <Button onClick={() => {
              setMode("proof");
              setProof(p => ({
                ...p,
                applicationNo: submitted.applicationNo,
                email: submitted.email,
              }));
            }}>
              Submit Payment Proof
            </Button>
          </Card>
        )}

        {mode === "apply" && !submitted && (
          <Card>
            <h2 style={sectionTitle}>Application Form</h2>
            <p style={sectionSub}>All fields are required.</p>

            <form onSubmit={submit} style={formGrid}>
              <Input value={form.fullName} onChange={v => setForm(f => ({...f,fullName:v}))} placeholder="Full name" />
              <Input value={form.email} onChange={v => setForm(f => ({...f,email:v}))} placeholder="Email" type="email" />
              <Input value={form.phoneNo} onChange={v => setForm(f => ({...f,phoneNo:v}))} placeholder="Phone number" />

              <label style={label}>Photo</label>
              <input type="file" accept="image/*" onChange={e => readPhoto(e.target.files?.[0])} style={fileInput} />
              {form.photo && <img src={form.photo} alt="Preview" style={preview} />}

              <Input value={form.zone} onChange={v => setForm(f => ({...f,zone:v}))} placeholder="Zone" />
              <Input value={form.branch} onChange={v => setForm(f => ({...f,branch:v}))} placeholder="Branch" />
              <Input value={form.workInBranch} onChange={v => setForm(f => ({...f,workInBranch:v}))} placeholder="Work in branch" />

              <select
                value={form.programId}
                onChange={e => setForm(f => ({...f,programId:e.target.value}))}
                style={selectStyle}
              >
                <option value="">Program you are applying for</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>

              <Button type="submit" disabled={busy}>
                {busy ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </Card>
        )}

        {mode === "proof" && (
          <Card>
            <h2 style={sectionTitle}>Submit Payment Proof</h2>
            <p style={sectionSub}>Submit your bank payment evidence for Main Admin verification.</p>

            <form onSubmit={submitProof} style={formGrid}>
              <Input value={proof.applicationNo} onChange={v => setProof(f => ({...f,applicationNo:v}))} placeholder="Application No" />
              <Input value={proof.email} onChange={v => setProof(f => ({...f,email:v}))} placeholder="Application email" type="email" />
              <Input value={proof.payerName} onChange={v => setProof(f => ({...f,payerName:v}))} placeholder="Payer name" />
              <Input value={proof.bankName} onChange={v => setProof(f => ({...f,bankName:v}))} placeholder="Bank name" />
              <Input value={proof.transactionReference} onChange={v => setProof(f => ({...f,transactionReference:v}))} placeholder="Transaction/reference number" />

              <label style={label}>Upload receipt/proof</label>
              <input type="file" accept="image/*,.pdf" onChange={e => readProof(e.target.files?.[0])} style={fileInput} />

              <Button type="submit" disabled={busy}>
                {busy ? "Submitting..." : "Submit Payment Proof"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCard}>
      <div style={{fontSize:12,color:C.muted,fontWeight:900}}>{label}</div>
      <div style={{fontSize:17,color:C.text,fontWeight:900,marginTop:5}}>{value}</div>
    </div>
  );
}

const page: CSSProperties = {
  minHeight:"100vh",
  background:"#f8fafc",
};

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  padding:32,
};

const logo: CSSProperties = {
  width:72,
  height:72,
  borderRadius:18,
  background:"#fff",
  padding:6,
  objectFit:"contain",
};

const title: CSSProperties = {
  margin:"18px 0 8px",
  fontSize:34,
  fontWeight:900,
};

const sub: CSSProperties = {
  margin:0,
  maxWidth:760,
  color:"rgba(255,255,255,.8)",
  lineHeight:1.7,
};

const content: CSSProperties = {
  maxWidth:900,
  margin:"-18px auto 40px",
  padding:"0 20px",
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:22,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"6px 0 18px",
  color:C.muted,
  fontSize:14,
};

const formGrid: CSSProperties = {
  display:"grid",
  gap:12,
};

const label: CSSProperties = {
  fontSize:13,
  fontWeight:900,
  color:C.text,
};

const fileInput: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:10,
  padding:12,
  background:"#fff",
};

const preview: CSSProperties = {
  width:90,
  height:90,
  borderRadius:14,
  objectFit:"cover",
};

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid "+C.border,
  borderRadius:10,
  background:"#fff",
};

const successGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:12,
  margin:"18px 0",
};

const infoCard: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#f8fafc",
};

const payBox: CSSProperties = {
  border:"1px solid #fde68a",
  background:"#fffbeb",
  borderRadius:14,
  padding:14,
  marginBottom:16,
  color:C.text,
  lineHeight:1.7,
};

