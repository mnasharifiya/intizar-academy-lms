import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createUser, addGroupStudentPending } from "../../lib/api";
import {
  approveApplication,
  loadApplications,
  markApplicationStudentCreated,
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
  const [finalPrograms, setFinalPrograms] = useState<Record<string, string>>({});
  const [studentPasswords, setStudentPasswords] = useState<Record<string, string>>({});
  const [studentGroups, setStudentGroups] = useState<Record<string, string>>({});

  const levels = data?.levels ?? [];
  const groups = data?.groups ?? [];
  const users = data?.users ?? [];
  const adminGroups = data?.adminGroups ?? [];

  const isMainController =
    user?.role === "admin" &&
    adminGroups.filter((ag: any) => ag.adminId === user.id).length === 0;

  async function refresh() {
    const res = await loadApplications();
    setApplications(res.applications);
    setPayments(res.payments);

    const nextRegs: Record<string, string> = {};
    const nextPrograms: Record<string, string> = {};
    const nextGroups: Record<string, string> = {};

    for (const app of res.applications) {
      const finalProgramId = app.finalProgramId || app.programId;
      const eligibleGroups = groupsForProgram(finalProgramId);

      nextPrograms[app.id] = finalProgramId;
      nextRegs[app.id] = app.finalRegNo || app.suggestedRegNo || makeSuggested(app, res.applications, finalProgramId);

      if (eligibleGroups.length > 0) {
        nextGroups[app.id] = eligibleGroups[0].id;
      }
    }

    setRegNos(nextRegs);
    setFinalPrograms(nextPrograms);
    setStudentGroups(prev => ({ ...nextGroups, ...prev }));
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
      if (filter === "created") return !!app.createdStudentId;
      return true;
    });
  }, [applications, payments, filter]);

  function programName(id: string) {
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function userName(id?: string | null) {
    if (!id) return "-";
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function latestPayment(applicationId: string) {
    return payments.find(p => p.applicationId === applicationId) || null;
  }

  function openDataFile(dataUrl: string | null | undefined, label: string) {
    if (!dataUrl) {
      alert(label + " is not available.");
      return;
    }

    const win = window.open("", "_blank", "noopener,noreferrer");

    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>${label}</title>
            <style>
              body { margin: 0; font-family: Arial, sans-serif; background: #0f172a; color: #fff; }
              .bar { padding: 12px 16px; background: #052e16; display: flex; justify-content: space-between; align-items: center; }
              a { color: #fff; font-weight: bold; }
              iframe, img { width: 100%; height: calc(100vh - 52px); border: none; object-fit: contain; background: #111827; }
            </style>
          </head>
          <body>
            <div class="bar">
              <strong>${label}</strong>
              <a href="${dataUrl}" download="${label.replace(/[^a-zA-Z0-9-_]/g, "-")}">Download</a>
            </div>
            ${
              dataUrl.startsWith("data:application/pdf")
                ? `<iframe src="${dataUrl}"></iframe>`
                : `<img src="${dataUrl}" />`
            }
          </body>
        </html>
      `);
      win.document.close();
    } else {
      downloadDataFile(dataUrl, label);
    }
  }

  function downloadDataFile(dataUrl: string | null | undefined, filename: string) {
    if (!dataUrl) {
      alert(filename + " is not available.");
      return;
    }

    const ext = dataUrl.startsWith("data:application/pdf") ? "pdf" : "jpg";
    const safe = filename.replace(/[^a-zA-Z0-9-_]/g, "-");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${safe}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function groupsForProgram(programId: string) {
    return groups.filter((g: any) =>
      g.levelId === programId &&
      g.isActive !== false
    );
  }

  function groupHasRestrictedAdmin(groupId: string) {
    return adminGroups.some((ag: any) => ag.groupId === groupId);
  }

  function makeSuggested(app: ApplicationRecord, allApps: ApplicationRecord[], programId?: string) {
    const finalProgramId = programId || app.finalProgramId || app.programId;
    const program = programName(finalProgramId);

    const same = allApps.filter(a =>
      a.branch === app.branch &&
      (a.finalProgramId || a.programId) === finalProgramId
    );

    const serial = Math.max(1, same.findIndex(a => a.id === app.id) + 1);
    return suggestRegNo(app.branch, program, serial);
  }

  function changeFinalProgram(app: ApplicationRecord, programId: string) {
    setFinalPrograms(prev => ({ ...prev, [app.id]: programId }));

    const newRegNo = makeSuggested(app, applications, programId);
    setRegNos(prev => ({ ...prev, [app.id]: newRegNo }));

    const eligibleGroups = groupsForProgram(programId);
    setStudentGroups(prev => ({ ...prev, [app.id]: eligibleGroups[0]?.id || "" }));
  }

  function downloadReceipt(app: ApplicationRecord, payment: ApplicationPayment) {
    const safeAppNo = app.applicationNo.replace(/[^a-zA-Z0-9-_]/g, "-");
    const safeName = app.fullName.replace(/[^a-zA-Z0-9-_]/g, "-");
    downloadDataFile(payment.paymentProof, `receipt-${safeAppNo}-${safeName}`);
  }

  async function verify(app: ApplicationRecord) {
    if (app.applicationStatus === "approved") {
      alert("Approved applications cannot be changed.");
      return;
    }

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
    const finalProgramId = finalPrograms[app.id] || app.finalProgramId || app.programId;

    if (app.applicationStatus === "approved") {
      alert("This application is already approved.");
      return;
    }

    if (app.paymentStatus !== "paid") {
      alert("Payment must be verified before approval.");
      return;
    }

    if (!finalProgramId) {
      alert("Final program/track is required.");
      return;
    }

    if (!regNo) {
      alert("Reg No is required.");
      return;
    }

    try {
      setBusy(true);
      await approveApplication(app.id, user.id, regNo, finalProgramId);
      await refresh();
      alert("Application approved. Final program and Reg No saved.");
    } catch (err: any) {
      alert(err?.message || "Application approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createStudentFromApplication(app: ApplicationRecord) {
    const finalProgramId = finalPrograms[app.id] || app.finalProgramId || app.programId;
    const regNo = regNos[app.id];
    const groupId = studentGroups[app.id];
    const password = studentPasswords[app.id];

    if (app.createdStudentId) {
      alert("Student account already created for this application.");
      return;
    }

    if (app.applicationStatus !== "approved") {
      alert("Application must be approved before creating student account.");
      return;
    }

    if (app.paymentStatus !== "paid") {
      alert("Payment must be verified before creating student account.");
      return;
    }

    if (!finalProgramId) {
      alert("Final program is required.");
      return;
    }

    if (!groupId) {
      alert("Please select final group.");
      return;
    }

    if (!regNo) {
      alert("Reg No is required.");
      return;
    }

    if (!password || password.length < 6) {
      alert("Password is required and must be at least 6 characters.");
      return;
    }

    const group = groups.find((g: any) => g.id === groupId);
    if (!group) {
      alert("Selected group was not found.");
      return;
    }

    if (group.levelId !== finalProgramId) {
      alert("Selected group does not belong to the final program.");
      return;
    }

    try {
      setBusy(true);

      const created = await (createUser as any)({
        name: app.fullName,
        email: app.email,
        password,
        role: "student",
        levelId: finalProgramId,
        status: "active",
      });

      const studentId =
        created?.id ||
        created?.user?.id ||
        created?.profile?.id ||
        created?.data?.id ||
        created?.data?.user?.id;

      if (!studentId) {
        throw new Error("Student was created, but student ID was not returned.");
      }

      await markApplicationStudentCreated({
        applicationId: app.id,
        studentId,
        finalProgramId,
        regNo,
      });

      const status = groupHasRestrictedAdmin(groupId) ? "pending" : "approved";

      await addGroupStudentPending(groupId, studentId, user.id, status);

      await refresh();

      setStudentPasswords(prev => ({ ...prev, [app.id]: "" }));

      if (status === "pending") {
        alert("Student account created. Final group access is waiting for Group Admin approval.");
      } else {
        alert("Student account created and group access approved.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not create student from application.");
    } finally {
      setBusy(false);
    }
  }

  if (!isMainController) {
    return (
      <Card>
        <h2 style={sectionTitle}>Applications</h2>
        <p style={sectionSub}>
          Only the Main Controller can verify payments, approve applications, and create students from applications.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        sub="Verify payment, correct final program/track, approve applications, and create student accounts."
      />

      <Card>
        <div style={toolbar}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
            <option value="all">All applications</option>
            <option value="submitted">Payment pending</option>
            <option value="proof">Proof submitted</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
            <option value="created">Student created</option>
          </select>

          <Input value={note} onChange={setNote} placeholder="Admin note optional" />
          <Button onClick={refresh} disabled={busy}>Refresh</Button>
        </div>
      </Card>

      <div style={{display:"grid",gap:16,marginTop:18}}>
        {visible.map(app => {
          const payment = latestPayment(app.id);
          const isApproved = app.applicationStatus === "approved";
          const finalProgramId = finalPrograms[app.id] || app.finalProgramId || app.programId;
          const originalProgram = programName(app.programId);
          const finalProgram = programName(finalProgramId);
          const programChanged = app.programId !== finalProgramId;
          const eligibleGroups = groupsForProgram(finalProgramId);
          const selectedGroupId = studentGroups[app.id] || "";
          const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);
          const needsGroupApproval = selectedGroupId ? groupHasRestrictedAdmin(selectedGroupId) : false;

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
                <Info label="Chosen Program" value={originalProgram} />
                <Info label="Final Program" value={finalProgram} />
                <Info label="Fee" value={"₦" + app.applicationFee.toLocaleString()} />
                <Info label="Student Account" value={app.createdStudentId ? "Created: " + userName(app.createdStudentId) : "Not created"} />
              </div>

              <div style={detailsBox}>
                <h3 style={detailsTitle}>Applicant Contact Details</h3>

                <div style={grid}>
                  <Info label="Email" value={app.email || "-"} />
                  <Info label="Phone" value={app.phoneNo || "-"} />
                  <Info label="Zone" value={app.zone || "-"} />
                  <Info label="Branch" value={app.branch || "-"} />
                  <Info label="Work in Branch" value={app.workInBranch || "-"} />
                  <Info label="Submitted At" value={app.createdAt ? new Date(app.createdAt).toLocaleString() : "-"} />
                </div>

                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
                  <button type="button" style={receiptButton} onClick={() => openDataFile(app.photo, "Applicant Photo - " + app.fullName)}>
                    View Applicant Photo
                  </button>

                  <button type="button" style={outlineReceiptButton} onClick={() => downloadDataFile(app.photo, "applicant-photo-" + app.fullName)}>
                    Download Applicant Photo
                  </button>
                </div>
              </div>

              {programChanged && (
                <div style={warningBox}>
                  Main Admin changed the final track from <strong>{originalProgram}</strong> to <strong>{finalProgram}</strong>.
                </div>
              )}

              {payment && (
                <div style={paymentBox}>
                  <strong>Latest Payment Record</strong>
                  <div style={meta}>Status: {payment.status}</div>
                  <div style={meta}>Payer: {payment.payerName || "-"}</div>
                  <div style={meta}>Bank: {payment.bankName || "-"}</div>
                  <div style={meta}>Transaction Ref: {payment.transactionReference || "-"}</div>

                  {payment.paymentProof && (
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
                      <button
                        type="button"
                        style={receiptButton}
                        onClick={() => openDataFile(payment.paymentProof, "Payment Receipt - " + app.fullName)}
                      >
                        View Receipt
                      </button>

                      <button
                        type="button"
                        style={outlineReceiptButton}
                        onClick={() => downloadReceipt(app, payment)}
                      >
                        Download Receipt
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={finalBox}>
                <label style={label}>Final Program / Track</label>
                <select
                  value={finalProgramId}
                  onChange={e => changeFinalProgram(app, e.target.value)}
                  style={selectStyle}
                  disabled={isApproved}
                >
                  {levels.map((level: any) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>

                <p style={meta}>
                  Use this when the applicant selected the wrong track or the program is not suitable for his/her current level in Intizar.
                </p>
              </div>

              <div style={regBox}>
                <label style={label}>Suggested / Final Reg No</label>
                <Input
                  value={regNos[app.id] || ""}
                  onChange={v => setRegNos(r => ({...r,[app.id]:v.toUpperCase()}))}
                  placeholder="Reg No"
                />
                <p style={meta}>
                  Format: first 2 letters of branch + serial + first 2 letters of final program. Main Admin can edit before approval.
                </p>
              </div>

              {isApproved && !app.createdStudentId && (
                <div style={createBox}>
                  <h3 style={createTitle}>Create Student Account from Application</h3>
                  <p style={meta}>
                    This will create the student profile using the approved application details and save the final Reg No.
                  </p>

                  <div style={createGrid}>
                    <div style={{display:"grid",gap:8}}>
                      <label style={label}>Final Group</label>
                      <select
                        value={selectedGroupId}
                        onChange={e => setStudentGroups(prev => ({...prev,[app.id]:e.target.value}))}
                        style={selectStyle}
                      >
                        <option value="">Select group</option>
                        {eligibleGroups.map((group: any) => (
                          <option key={group.id} value={group.id}>
                            {group.name} {groupHasRestrictedAdmin(group.id) ? "(Group Admin approval required)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{display:"grid",gap:8}}>
                      <label style={label}>Student Password</label>
                      <Input
                        type="password"
                        value={studentPasswords[app.id] || ""}
                        onChange={v => setStudentPasswords(prev => ({...prev,[app.id]:v}))}
                        placeholder="Temporary password"
                      />
                    </div>
                  </div>

                  {selectedGroup && (
                    <div style={needsGroupApproval ? warningBox : successBox}>
                      Final group: <strong>{selectedGroup.name}</strong>.{" "}
                      {needsGroupApproval
                        ? "This student will wait for Group Admin final approval."
                        : "This student will be approved immediately because no restricted admin is assigned to this group."}
                    </div>
                  )}

                  {eligibleGroups.length === 0 && (
                    <div style={warningBox}>
                      No active group exists for this final program. Create a group first before creating the student.
                    </div>
                  )}

                  <div style={{marginTop:14}}>
                    <Button onClick={() => createStudentFromApplication(app)} disabled={busy || eligibleGroups.length === 0}>
                      Create Student Account
                    </Button>
                  </div>
                </div>
              )}

              {app.createdStudentId && (
                <div style={successBox}>
                  Student account has already been created for this application.
                </div>
              )}

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
                <Button
                  onClick={() => verify(app)}
                  disabled={busy || app.paymentStatus === "paid" || isApproved}
                >
                  Verify Payment
                </Button>

                <Button
                  variant="danger"
                  onClick={() => reject(app)}
                  disabled={busy || isApproved}
                >
                  Reject Payment
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => approve(app)}
                  disabled={busy || isApproved}
                >
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
const label: CSSProperties = {fontSize:13,fontWeight:900,color:C.text};
const toolbar: CSSProperties = {display:"grid",gridTemplateColumns:"220px 1fr auto",gap:12,alignItems:"center"};
const selectStyle: CSSProperties = {padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10,background:"#fff"};
const appTop: CSSProperties = {display:"flex",justifyContent:"space-between",gap:16,alignItems:"start",flexWrap:"wrap"};
const avatar: CSSProperties = {width:62,height:62,borderRadius:16,objectFit:"cover",border:"1px solid "+C.border};
const grid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:16};
const infoCard: CSSProperties = {border:"1px solid "+C.border,borderRadius:14,padding:14,background:"#f8fafc"};
const paymentBox: CSSProperties = {border:"1px solid #fde68a",background:"#fffbeb",borderRadius:14,padding:14,marginTop:16,lineHeight:1.6};
const warningBox: CSSProperties = {border:"1px solid #fed7aa",background:"#fff7ed",borderRadius:14,padding:12,marginTop:14,color:"#9a3412",fontSize:13};
const successBox: CSSProperties = {border:"1px solid #bbf7d0",background:"#f0fdf4",borderRadius:14,padding:12,marginTop:14,color:"#166534",fontSize:13};
const detailsBox: CSSProperties = {border:"1px solid #e2e8f0",background:"#f8fafc",borderRadius:16,padding:14,marginTop:16};
const detailsTitle: CSSProperties = {margin:"0 0 12px",fontSize:17,fontWeight:900,color:C.text};
const receiptButton: CSSProperties = {border:"none",background:C.primary,color:"#fff",borderRadius:10,padding:"8px 12px",fontWeight:900,cursor:"pointer",fontSize:13};
const outlineReceiptButton: CSSProperties = {border:"1px solid #bbf7d0",background:"#fff",color:C.primary,borderRadius:10,padding:"8px 12px",fontWeight:900,cursor:"pointer",fontSize:13};
const finalBox: CSSProperties = {display:"grid",gap:8,marginTop:16};
const regBox: CSSProperties = {display:"grid",gap:8,marginTop:16};
const createBox: CSSProperties = {border:"1px solid #dbeafe",background:"#eff6ff",borderRadius:16,padding:16,marginTop:18};
const createTitle: CSSProperties = {margin:"0 0 6px",color:"#1e3a8a",fontSize:17,fontWeight:900};
const createGrid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:12};
const emptyState: CSSProperties = {minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",color:C.muted};


