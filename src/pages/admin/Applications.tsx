import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  approveApplication,
  loadApplications,
  rejectApplicationPayment,
  verifyApplicationPayment,
  suggestRegNo,
  type ApplicationPayment,
  type ApplicationRecord,
} from "../../lib/applicationApi";

export default function AdminApplications({
  user,
  data,
}: {
  user: any;
  data?: any;
}) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [payments, setPayments] = useState<ApplicationPayment[]>([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [regNos, setRegNos] = useState<Record<string, string>>({});

  const levels = data?.levels ?? [];
  const adminGroups = data?.adminGroups ?? [];
  const isMainController =
    user?.role === "admin" &&
    adminGroups.filter((ag: any) => ag.adminId === user.id).length === 0;

  async function refresh() {
    const res = await loadApplications();
    setApplications(res.applications);
    setPayments(res.payments);

    const next: Record<string, string> = {};
    for (const app of res.applications) {
      next[app.id] = app.finalRegNo || app.suggestedRegNo || makeSuggested(app, res.applications);
    }
    setRegNos(next);
  }

  useEffect(() => {
    refresh().catch(err => alert(err?.message || "Could not load applications."));
  }, []);

  const visible = useMemo(() => {
    return applications.filter(app => {
      if (filter === "all") return true;
      if (filter === "submitted") return app.paymentStatus === "pending";
      if (filter === "proof") return latestPayment(app.id)?.status === "submitted";
      if (filter === "paid") return app.paymentStatus === "paid";
      if (filter === "approved") return app.applicationStatus === "approved";
      return true;
    });
  }, [applications, payments, filter]);

  function programName(id: string) {
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function latestPayment(applicationId: string) {
    return payments.find(p => p.applicationId === applicationId) || null;
  }

  function makeSuggested(app: ApplicationRecord, allApps: ApplicationRecord[]) {
    const program = programName(app.programId);
    const same = allApps.filter(a => a.branch === app.branch && a.programId === app.programId);
    const serial = Math.max(1, same.findIndex(a => a.id === app.id) + 1);
    return suggestRegNo(app.branch, program, serial);
  }

  async function verify(app: ApplicationRecord) {
    const payment = latestPayment(app.id);

    try {
      setBusy(true);
      await verifyApplicationPayment(app.id, payment?.id ?? null, user.id, note);
      await refresh();
      setNote("");
      alert("Payment verified.");
    } catch (err: any) {
      alert(err?.message || "Payment verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reject(app: ApplicationRecord) {
    if (app.applicationStatus === "approved") {
      alert("Approved applications cannot be rejected.");
      return;
    }

    const payment = latestPayment(app.id);

    try {
      setBusy(true);
      await rejectApplicationPayment(app.id, payment?.id ?? null, user.id, note);
      await refresh();
      setNote("");
      alert("Payment rejected.");
    } catch (err: any) {
      alert(err?.message || "Payment rejection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(app: ApplicationRecord) {
    const regNo = regNos[app.id];

    if (app.paymentStatus !== "paid") {
      alert("Payment must be verified before approval.");
      return;
    }

    if (!regNo) {
      alert("Reg No is required.");
      return;
    }

    try {
      setBusy(true);
      await approveApplication(app.id, user.id, regNo);
      await refresh();
      alert("Application approved. Now create the student account from Users page and use this Reg No.");
    } catch (err: any) {
      alert(err?.message || "Application approval failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadReceipt(app: ApplicationRecord, payment: ApplicationPayment) {
    if (!payment.paymentProof) {
      alert("No receipt/proof uploaded for this payment.");
      return;
    }

    const ext = payment.paymentProof.startsWith("data:application/pdf") ? "pdf" : "jpg";
    const safeAppNo = app.applicationNo.replace(/[^a-zA-Z0-9-_]/g, "-");
    const safeName = app.fullName.replace(/[^a-zA-Z0-9-_]/g, "-");
    const filename = `receipt-${safeAppNo}-${safeName}.${ext}`;

    const a = document.createElement("a");
    a.href = payment.paymentProof;
    a.download = filename;
    a.click();
  }
  if (!isMainController) {
    return (
      <Card>
        <h2 style={sectionTitle}>Applications</h2>
        <p style={sectionSub}>
          Only the Main Controller can verify payments and approve applications.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        sub="Verify payment, approve applications, and prepare Reg No for enrollment."
      />

      <Card>
        <div style={toolbar}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
            <option value="all">All applications</option>
            <option value="submitted">Payment pending</option>
            <option value="proof">Proof submitted</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
          </select>

          <Input value={note} onChange={setNote} placeholder="Admin note optional" />
          <Button onClick={refresh} disabled={busy}>Refresh</Button>
        </div>
      </Card>

      <div style={{display:"grid",gap:16,marginTop:18}}>
        {visible.map(app => {
          const payment = latestPayment(app.id);
          return (
            <Card key={app.id}>
              <div style={appTop}>
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <img src={app.photo} alt={app.fullName} style={avatar} />
                  <div>
                    <h2 style={{margin:"0 0 5px",color:C.text}}>{app.fullName}</h2>
                    <div style={meta}>{app.email} · {app.phoneNo}</div>
                    <div style={meta}>{app.zone} / {app.branch} / {app.workInBranch}</div>
                  </div>
                </div>

                <div style={{textAlign:"right"}}>
                  <Status label={app.applicationStatus} />
                  <div style={{height:6}} />
                  <PayStatus label={app.paymentStatus} />
                </div>
              </div>

              <div style={grid}>
                <Info label="Application No" value={app.applicationNo} />
                <Info label="Payment Reference" value={app.paymentReference} />
                <Info label="Program" value={programName(app.programId)} />
                <Info label="Fee" value={"₦" + app.applicationFee.toLocaleString()} />
              </div>

              {payment && (
                <div style={paymentBox}>
                  <strong>Latest Payment Record</strong>
                  <div style={meta}>Status: {payment.status}</div>
                  <div style={meta}>Payer: {payment.payerName || "-"}</div>
                  <div style={meta}>Bank: {payment.bankName || "-"}</div>
                  <div style={meta}>Transaction Ref: {payment.transactionReference || "-"}</div>

                  {payment.paymentProof && (
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
                      <a href={payment.paymentProof} target="_blank" rel="noreferrer" style={linkStyle}>
                        Open Receipt
                      </a>

                      <button
                        type="button"
                        style={receiptButton}
                        onClick={() => downloadReceipt(app, payment)}
                      >
                        Download Receipt
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={regBox}>
                <label style={{fontSize:13,fontWeight:900,color:C.text}}>Suggested / Final Reg No</label>
                <Input
                  value={regNos[app.id] || ""}
                  onChange={v => setRegNos(r => ({...r,[app.id]:v.toUpperCase()}))}
                  placeholder="Reg No"
                />
                <p style={meta}>
                  Format: first 2 letters of branch + serial + first 2 letters of program. Main Admin can edit before approval.
                </p>
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
                <Button onClick={() => verify(app)} disabled={busy || app.paymentStatus === "paid" || app.applicationStatus === "approved"}>
                  Verify Payment
                </Button>

                <Button variant="danger" onClick={() => reject(app)} disabled={busy || app.applicationStatus === "approved"}>
                  Reject Payment
                </Button>

                <Button variant="secondary" onClick={() => approve(app)} disabled={busy || app.applicationStatus === "approved"}>
                  Approve Application
                </Button>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card>
            <div style={emptyState}>
              <strong>No applications found</strong>
              <p>Applications will appear here after applicants submit the public form.</p>
            </div>
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
      <div style={{fontSize:15,color:C.text,fontWeight:900,marginTop:5}}>{value}</div>
    </div>
  );
}

function Status({ label }: { label: string }) {
  return <span style={badge("#e0f2fe", "#075985")}>{label}</span>;
}

function PayStatus({ label }: { label: string }) {
  const paid = label === "paid";
  return <span style={badge(paid ? "#dcfce7" : "#fef3c7", paid ? "#166534" : "#92400e")}>{label}</span>;
}

function badge(bg: string, color: string): CSSProperties {
  return {
    display:"inline-flex",
    padding:"7px 11px",
    borderRadius:999,
    background:bg,
    color,
    fontSize:12,
    fontWeight:900,
    textTransform:"capitalize",
  };
}

const sectionTitle: CSSProperties = {margin:0,fontSize:22,color:C.text,fontWeight:900};
const sectionSub: CSSProperties = {margin:"6px 0 0",color:C.muted,fontSize:14};
const meta: CSSProperties = {fontSize:13,color:C.muted,marginTop:4};
const toolbar: CSSProperties = {display:"grid",gridTemplateColumns:"220px 1fr auto",gap:12,alignItems:"center"};
const selectStyle: CSSProperties = {padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10,background:"#fff"};
const appTop: CSSProperties = {display:"flex",justifyContent:"space-between",gap:16,alignItems:"start",flexWrap:"wrap"};
const avatar: CSSProperties = {width:62,height:62,borderRadius:16,objectFit:"cover",border:"1px solid "+C.border};
const grid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:16};
const infoCard: CSSProperties = {border:"1px solid "+C.border,borderRadius:14,padding:14,background:"#f8fafc"};
const paymentBox: CSSProperties = {border:"1px solid #fde68a",background:"#fffbeb",borderRadius:14,padding:14,marginTop:16,lineHeight:1.6};
const linkStyle: CSSProperties = {display:"inline-block",marginTop:8,color:C.primary,fontWeight:900,textDecoration:"none"};
const regBox: CSSProperties = {display:"grid",gap:8,marginTop:16};
const emptyState: CSSProperties = {minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",color:C.muted};


const receiptButton: CSSProperties = {
  border:"none",
  background:C.primary,
  color:"#fff",
  borderRadius:10,
  padding:"8px 12px",
  fontWeight:900,
  cursor:"pointer",
  fontSize:13,
};
