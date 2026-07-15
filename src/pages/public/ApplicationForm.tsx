import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Button, Card } from "../../components/common/ui";
import { APP_NAME, C } from "../../lib/theme";
import {
  listApplicationPrograms,
  submitApplication,
  submitPaymentProof,
} from "../../lib/applicationApi";
import {
  DEFAULT_SETTINGS,
  loadAppSettings,
  type AppSettings,
} from "../../lib/settingsApi";

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
  paymentReference: "",
  payerName: "",
  bankName: "",
  transactionReference: "",
  paymentProof: "",
};

export default function ApplicationForm({ onBackToLogin }: { onBackToLogin?: () => void }) {
  const [mode, setMode] = useState<"apply" | "proof">("apply");
  const [programs, setPrograms] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState(emptyProof);
  const [submitted, setSubmitted] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [programList, appSettings] = await Promise.all([
        listApplicationPrograms(),
        loadAppSettings().catch(() => DEFAULT_SETTINGS),
      ]);

      setPrograms(programList ?? []);
      setSettings(appSettings);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not load application form.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function updateForm(key: keyof typeof emptyForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateProof(key: keyof typeof emptyProof, value: string) {
    setProof(prev => ({ ...prev, [key]: value }));
  }

  async function readImage(file: File | null, callback: (value: string) => void) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      callback(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  }

  function validateApplication() {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!form.phoneNo.trim()) return "Phone number is required.";
    if (!form.photo) return "Photo is required.";
    if (!form.zone.trim()) return "Zone is required.";
    if (!form.branch.trim()) return "Branch is required.";
    if (!form.workInBranch.trim()) return "Work in branch is required.";
    if (!form.programId) return "Program is required.";

    return "";
  }

  async function submitNewApplication(e: FormEvent) {
    e.preventDefault();

    const problem = validateApplication();

    if (problem) {
      alert(problem);
      return;
    }

    setBusy(true);

    try {
      const result = await submitApplication({
        ...form,
        applicationFee: Number(settings.applicationFee || 0),
      } as any);

      setSubmitted(result);

      setProof({
        applicationNo: result?.applicationNo || "",
        paymentReference: result?.paymentReference || "",
        payerName: "",
        bankName: "",
        transactionReference: "",
        paymentProof: "",
      });

      setForm(emptyForm);
      setMode("proof");

      alert("Application submitted successfully. Your form has been cleared. Please pay and submit your payment proof.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not submit application.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProofForm(e: FormEvent) {
    e.preventDefault();

    if (!proof.applicationNo.trim() && !proof.paymentReference.trim()) {
      alert("Application number or payment reference is required.");
      return;
    }

    if (!proof.payerName.trim()) {
      alert("Payer name is required.");
      return;
    }

    if (!proof.bankName.trim()) {
      alert("Bank name used is required.");
      return;
    }

    if (!proof.transactionReference.trim()) {
      alert("Transaction reference is required.");
      return;
    }

    if (!proof.paymentProof) {
      alert("Payment proof image is required.");
      return;
    }

    setBusy(true);

    try {
      await submitPaymentProof(proof as any);
      setProof(emptyProof);
      setSubmitted(null);
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

        <div style={tabs}>
          <Button variant={mode === "apply" ? undefined : "secondary"} onClick={() => setMode("apply")}>
            New Application
          </Button>

          <Button variant={mode === "proof" ? undefined : "secondary"} onClick={() => setMode("proof")}>
            Submit Payment Proof
          </Button>

          {onBackToLogin && (
            <Button variant="secondary" onClick={onBackToLogin}>
              Back to Login
            </Button>
          )}
        </div>
      </div>

      <div style={container}>
        <PaymentDetails settings={settings} />

        {submitted && (
          <Card>
            <h2 style={sectionTitle}>Application Submitted</h2>

            <p style={sectionSub}>
              Keep these details safely. You will use them when submitting payment proof.
            </p>

            <div style={infoGrid}>
              <Info label="Application Number" value={submitted?.applicationNo || "-"} />
              <Info label="Payment Reference" value={submitted?.paymentReference || "-"} />
              <Info label="Application Fee" value={"₦" + Number(settings.applicationFee || 0).toLocaleString()} />
            </div>
          </Card>
        )}

        {mode === "apply" && (
          <Card>
            <h2 style={sectionTitle}>New Application Form</h2>

            <p style={sectionSub}>
              Fill all required information correctly. Main Admin can later approve and create your student account.
            </p>

            <form onSubmit={submitNewApplication} style={formGrid}>
              <Field label="Full Name">
                <TextInput value={form.fullName} onChange={(e: any) => updateForm("fullName", e.target.value)} />
              </Field>

              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e: any) => updateForm("email", e.target.value)} />
              </Field>

              <Field label="Phone Number">
                <TextInput value={form.phoneNo} onChange={(e: any) => updateForm("phoneNo", e.target.value)} />
              </Field>

              <Field label="Zone">
                <TextInput value={form.zone} onChange={(e: any) => updateForm("zone", e.target.value)} />
              </Field>

              <Field label="Branch">
                <TextInput value={form.branch} onChange={(e: any) => updateForm("branch", e.target.value)} />
              </Field>

              <Field label="Work in Branch">
                <TextInput
                  value={form.workInBranch}
                  onChange={(e: any) => updateForm("workInBranch", e.target.value)}
                  placeholder="Example: Secretary, member, youth section, etc."
                />
              </Field>

              <Field label="Program Applying For">
                <select
                  style={selectStyle}
                  value={form.programId}
                  onChange={(e) => updateForm("programId", e.target.value)}
                >
                  <option value="">Select program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Applicant Photo">
                <input
                  style={fileInput}
                  type="file"
                  accept="image/*"
                  onChange={(e) => readImage(e.target.files?.[0] || null, value => updateForm("photo", value))}
                />

                {form.photo && <img src={form.photo} alt="Applicant" style={preview} />}
              </Field>

              <div style={fullWidth}>
                <Button type="submit" disabled={busy}>
                  {busy ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {mode === "proof" && (
          <Card>
            <h2 style={sectionTitle}>Submit Payment Proof</h2>

            <p style={sectionSub}>
              After bank transfer, upload your payment proof. Main Admin will verify it before approval.
            </p>

            <form onSubmit={submitProofForm} style={formGrid}>
              <Field label="Application Number">
                <TextInput
                  value={proof.applicationNo}
                  onChange={(e: any) => updateProof("applicationNo", e.target.value)}
                  placeholder="Example: APP-..."
                />
              </Field>

              <Field label="Payment Reference">
                <TextInput
                  value={proof.paymentReference}
                  onChange={(e: any) => updateProof("paymentReference", e.target.value)}
                  placeholder="Example: PAY-..."
                />
              </Field>

              <Field label="Payer Name">
                <TextInput value={proof.payerName} onChange={(e: any) => updateProof("payerName", e.target.value)} />
              </Field>

              <Field label="Bank Name Used">
                <TextInput value={proof.bankName} onChange={(e: any) => updateProof("bankName", e.target.value)} />
              </Field>

              <Field label="Transaction Reference">
                <TextInput
                  value={proof.transactionReference}
                  onChange={(e: any) => updateProof("transactionReference", e.target.value)}
                  placeholder="Bank transfer reference"
                />
              </Field>

              <Field label="Payment Proof Image">
                <input
                  style={fileInput}
                  type="file"
                  accept="image/*"
                  onChange={(e) => readImage(e.target.files?.[0] || null, value => updateProof("paymentProof", value))}
                />

                {proof.paymentProof && <img src={proof.paymentProof} alt="Payment Proof" style={preview} />}
              </Field>

              <div style={fullWidth}>
                <Button type="submit" disabled={busy}>
                  {busy ? "Submitting..." : "Submit Payment Proof"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function PaymentDetails({ settings }: { settings: AppSettings }) {
  return (
    <Card>
      <div style={paymentBox}>
        <h2 style={{ margin: "0 0 8px", color: "#14532d", fontSize: 20, fontWeight: 900 }}>
          Official Payment Details
        </h2>

        <p style={{ margin: "0 0 14px", color: "#166534", lineHeight: 1.7 }}>
          Application Fee: <strong>₦{Number(settings.applicationFee || 0).toLocaleString()}</strong>
        </p>

        <div style={infoGrid}>
          <Info label="Bank Name" value={settings.bankName || "Not set yet"} />
          <Info label="Account Name" value={settings.accountName || "Not set yet"} />
          <Info label="Account Number" value={settings.accountNumber || "Not set yet"} />
        </div>

        <p style={{ margin: "14px 0 0", color: "#166534", lineHeight: 1.7 }}>
          {settings.paymentInstructions}
        </p>
      </div>
    </Card>
  );
}

function TextInput(props: any) {
  return <input style={inputStyle} {...props} />;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: any;
}) {
  return (
    <label style={field}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCard}>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 17, color: C.text, fontWeight: 900, marginTop: 5 }}>{value}</div>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
};

const hero: CSSProperties = {
  background: "linear-gradient(135deg,#052e16,#166534)",
  color: "#fff",
  padding: "38px 20px",
  textAlign: "center",
};

const logo: CSSProperties = {
  width: 86,
  height: 86,
  objectFit: "contain",
  borderRadius: 20,
  background: "#fff",
  padding: 8,
  marginBottom: 14,
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 36,
  fontWeight: 900,
};

const sub: CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 720,
  color: "rgba(255,255,255,.82)",
  lineHeight: 1.7,
};

const tabs: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
  flexWrap: "wrap",
  marginTop: 20,
};

const container: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: 22,
  display: "grid",
  gap: 18,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 22,
  fontWeight: 900,
};

const sectionSub: CSSProperties = {
  margin: "7px 0 0",
  color: C.muted,
  fontSize: 14,
  lineHeight: 1.7,
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 14,
  marginTop: 18,
};

const fullWidth: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "flex-end",
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: C.text,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
  background: "#fff",
  fontSize: 14,
  color: C.text,
};

const selectStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
  background: "#fff",
  fontSize: 14,
};

const fileInput: CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "11px 12px",
  background: "#fff",
};

const preview: CSSProperties = {
  marginTop: 8,
  width: 120,
  height: 120,
  borderRadius: 14,
  objectFit: "cover",
  border: "1px solid #e2e8f0",
};

const paymentBox: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #dcfce7",
  background: "#f0fdf4",
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
};

const infoCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #dcfce7",
  borderRadius: 14,
  padding: 12,
};




