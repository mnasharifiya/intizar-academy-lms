import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  createCertificate,
  loadCertificates,
  makeCertificateNo,
  revokeCertificate,
  type CertificateRecord,
} from "../../lib/certificateApi";
import { loadApplications, type ApplicationRecord } from "../../lib/applicationApi";

const REQUIRED_OVERALL = 70;
const REQUIRED_ATTENDANCE = 70;

export default function AdminCertificates({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const users = data?.users ?? [];
  const levels = data?.levels ?? [];
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const grades = data?.grades ?? [];
  const attendance = data?.attendance ?? [];

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const students = users.filter((u: any) => u.role === "student");

  async function refresh() {
    const [certs, apps] = await Promise.all([
      loadCertificates(),
      loadApplications().then(res => res.applications).catch(() => []),
    ]);

    setCertificates(certs);
    setApplications(apps);
  }

  useEffect(() => {
    refresh().catch(err => alert(err?.message || "Could not load certificates."));
  }, []);

  function programName(id?: string | null) {
    if (!id) return "-";
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function groupName(id?: string | null) {
    if (!id) return "-";
    return groups.find((g: any) => g.id === id)?.name || "-";
  }

  function studentGroup(studentId: string) {
    const membership = groupStudents.find((gs: any) =>
      gs.studentId === studentId &&
      (gs.status === "approved" || !gs.status)
    );

    return groups.find((g: any) => g.id === membership?.groupId) || null;
  }

  function studentApplication(studentId: string) {
    return applications.find(app => app.createdStudentId === studentId) || null;
  }

  function studentCertificate(studentId: string) {
    return certificates.find(c => c.studentId === studentId && c.status === "valid") || null;
  }

  function averageGrade(studentId: string) {
    const list = grades.filter((g: any) => g.studentId === studentId);

    if (!list.length) return null;

    return Math.round(
      list.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / list.length
    );
  }

  function attendancePercent(studentId: string) {
    const list = attendance.filter((a: any) => a.studentId === studentId);

    if (!list.length) return null;

    const good = list.filter((a: any) =>
      a.status === "present" ||
      a.status === "late" ||
      a.status === "excused"
    ).length;

    return Math.round((good / list.length) * 100);
  }

  function eligibility(student: any) {
    const app = studentApplication(student.id);
    const group = studentGroup(student.id);
    const avg = averageGrade(student.id);
    const att = attendancePercent(student.id);

    const reasons: string[] = [];

    if (!group) {
      reasons.push("Student is not approved in any group.");
    }

    if (avg === null) {
      reasons.push("No assessment/grade record found.");
    } else if (avg < REQUIRED_OVERALL) {
      reasons.push(`Overall assessment is ${avg}%, required ${REQUIRED_OVERALL}%.`);
    }

    if (att !== null && att < REQUIRED_ATTENDANCE) {
      reasons.push(`Attendance is ${att}%, required ${REQUIRED_ATTENDANCE}%.`);
    }

    if (app && !(app.paymentStatus === "paid" && app.applicationStatus === "approved")) {
      reasons.push("Application payment or approval is not complete.");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      average: avg,
      attendance: att,
      application: app,
      group,
      programId: app?.finalProgramId || student.levelId || group?.levelId || null,
      programName: programName(app?.finalProgramId || student.levelId || group?.levelId),
      regNo: app?.finalRegNo || app?.suggestedRegNo || (student as any).regNo || null,
      branch: app?.branch || null,
      zone: app?.zone || null,
    };
  }

  const rows = useMemo(() => {
    return students
      .map((student: any) => {
        const e = eligibility(student);
        const cert = studentCertificate(student.id);

        return {
          student,
          eligibility: e,
          certificate: cert,
        };
      })
      .filter((row: any) => {
        const q = search.trim().toLowerCase();
        const certStatus = row.certificate ? "issued" : "not-issued";

        if (filter === "eligible" && !row.eligibility.eligible) return false;
        if (filter === "blocked" && row.eligibility.eligible) return false;
        if (filter === "issued" && !row.certificate) return false;
        if (filter === "not-issued" && row.certificate) return false;

        if (!q) return true;

        return (
          String(row.student.name || "").toLowerCase().includes(q) ||
          String(row.student.email || "").toLowerCase().includes(q) ||
          String(row.eligibility.regNo || "").toLowerCase().includes(q) ||
          certStatus.includes(q)
        );
      });
  }, [students, certificates, applications, grades, attendance, search, filter]);

  async function generate(student: any) {
    const e = eligibility(student);

    if (!e.eligible) {
      alert("Certificate blocked:\n\n" + e.reasons.join("\n"));
      return;
    }

    const existing = studentCertificate(student.id);
    if (existing) {
      alert("This student already has a valid certificate.");
      return;
    }

    const certificateNo = makeCertificateNo({
      regNo: e.regNo,
      programName: e.programName,
    });

    try {
      setBusy(true);

      const cert = await createCertificate({
        studentId: student.id,
        programId: e.programId,
        groupId: e.group?.id || null,
        certificateNo,
        regNo: e.regNo,
        studentName: student.name,
        programName: e.programName,
        branch: e.branch,
        zone: e.zone,
        issuedBy: user.id,
        eligibilitySnapshot: {
          requiredOverall: REQUIRED_OVERALL,
          requiredAttendance: REQUIRED_ATTENDANCE,
          average: e.average,
          attendance: e.attendance,
          group: e.group?.name || null,
          paymentStatus: e.application?.paymentStatus || "legacy/manual student",
          applicationStatus: e.application?.applicationStatus || "legacy/manual student",
          generatedAt: new Date().toISOString(),
        },
      });

      await refresh();
      printCertificate(cert);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not generate certificate.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(cert: CertificateRecord) {
    const reason = prompt("Reason for revoking this certificate:");

    if (!reason) return;

    try {
      setBusy(true);
      await revokeCertificate({
        certificateId: cert.id,
        revokedBy: user.id,
        reason,
      });

      await refresh();
      alert("Certificate revoked.");
    } catch (err: any) {
      alert(err?.message || "Could not revoke certificate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Certificates"
        sub="Generate official INTIZAR certificates only for eligible students."
      />

      <Card>
        <div style={rulesBox}>
          <strong>Certificate Blocking Rules</strong>
          <div>Overall assessment required: {REQUIRED_OVERALL}%</div>
          <div>Attendance required: {REQUIRED_ATTENDANCE}% if attendance records exist</div>
          <div>Student must be approved in a group</div>
          <div>Application payment must be verified when the student was created from application</div>
        </div>

        <div style={toolbar}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
            <option value="all">All students</option>
            <option value="eligible">Eligible only</option>
            <option value="blocked">Blocked only</option>
            <option value="issued">Certificate issued</option>
            <option value="not-issued">Not issued</option>
          </select>

          <Input value={search} onChange={setSearch} placeholder="Search student, email, reg no..." />

          <Button onClick={refresh} disabled={busy}>
            Refresh
          </Button>
        </div>
      </Card>

      <div style={{display:"grid",gap:16,marginTop:18}}>
        {rows.map((row: any) => {
          const student = row.student;
          const e = row.eligibility;
          const cert = row.certificate;

          return (
            <Card key={student.id}>
              <div style={topRow}>
                <div>
                  <h2 style={studentName}>{student.name}</h2>
                  <div style={meta}>{student.email}</div>
                  <div style={meta}>Program: {e.programName}</div>
                  <div style={meta}>Group: {groupName(e.group?.id)}</div>
                  <div style={meta}>Reg No: {e.regNo || "-"}</div>
                </div>

                <div style={{textAlign:"right"}}>
                  {cert ? <Badge label="Certificate Issued" good /> : e.eligible ? <Badge label="Eligible" good /> : <Badge label="Blocked" />}
                </div>
              </div>

              <div style={grid}>
                <Info label="Overall Assessment" value={e.average === null ? "-" : e.average + "%"} />
                <Info label="Attendance" value={e.attendance === null ? "-" : e.attendance + "%"} />
                <Info label="Payment" value={e.application ? e.application.paymentStatus : "Legacy/manual"} />
                <Info label="Application" value={e.application ? e.application.applicationStatus : "Legacy/manual"} />
              </div>

              {!e.eligible && (
                <div style={blockedBox}>
                  <strong>Certificate blocked</strong>
                  <ul style={{margin:"8px 0 0",paddingLeft:18}}>
                    {e.reasons.map((reason: string) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cert && (
                <div style={certBox}>
                  <strong>Certificate No: {cert.certificateNo}</strong>
                  <div style={meta}>Issued: {new Date(cert.issuedAt).toLocaleString()}</div>
                  <div style={meta}>Verification Token: {cert.verificationToken}</div>
                </div>
              )}

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}>
                {!cert && (
                  <Button onClick={() => generate(student)} disabled={busy || !e.eligible}>
                    Generate Certificate
                  </Button>
                )}

                {cert && (
                  <>
                    <Button onClick={() => printCertificate(cert)} disabled={busy}>
                      Print / Save PDF
                    </Button>

                    <Button variant="danger" onClick={() => revoke(cert)} disabled={busy}>
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}

        {rows.length === 0 && (
          <Card>
            <div style={emptyState}>
              <strong>No students found</strong>
              <p>No student matches the selected filter.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function printCertificate(cert: CertificateRecord) {
  const win = window.open("", "_blank");

  if (!win) {
    alert("Popup blocked. Please allow popups to print the certificate.");
    return;
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString();

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(cert.certificateNo)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }

          body {
            margin: 0;
            background: #f1f5f9;
            font-family: Georgia, "Times New Roman", serif;
            color: #111827;
          }

          .print-button {
            position: fixed;
            top: 14px;
            right: 14px;
            z-index: 20;
            padding: 10px 16px;
            font-weight: bold;
            border: 0;
            background: #166534;
            color: #fff;
            border-radius: 10px;
            cursor: pointer;
          }

          .page {
            width: 297mm;
            height: 210mm;
            margin: 0 auto;
            background: #fff;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            padding: 18mm;
          }

          .border {
            border: 5px double #166534;
            height: 100%;
            box-sizing: border-box;
            padding: 12mm;
            position: relative;
          }

          .watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.055;
            z-index: 0;
          }

          .watermark img {
            width: 380px;
            height: 380px;
            object-fit: contain;
          }

          .content {
            position: relative;
            z-index: 2;
            text-align: center;
          }

          .logo {
            width: 86px;
            height: 86px;
            object-fit: contain;
            margin-bottom: 8px;
          }

          .org {
            font-size: 26px;
            font-weight: 900;
            color: #052e16;
            letter-spacing: 1px;
          }

          .subtitle {
            font-size: 14px;
            color: #475569;
            margin-top: 4px;
          }

          .cert-title {
            margin-top: 18px;
            font-size: 42px;
            font-weight: 900;
            color: #166534;
            letter-spacing: 3px;
            text-transform: uppercase;
          }

          .small-title {
            margin-top: 6px;
            font-size: 18px;
            color: #334155;
            letter-spacing: 1px;
          }

          .presented {
            margin-top: 24px;
            font-size: 17px;
            color: #475569;
          }

          .student-name {
            margin: 12px auto 8px;
            font-size: 40px;
            font-weight: 900;
            color: #111827;
            border-bottom: 2px solid #166534;
            display: inline-block;
            padding: 0 28px 8px;
          }

          .body-text {
            margin: 18px auto 0;
            max-width: 840px;
            font-size: 18px;
            line-height: 1.75;
            color: #334155;
          }

          .program {
            font-weight: 900;
            color: #052e16;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            margin-top: 22px;
            font-family: Arial, sans-serif;
            text-align: left;
          }

          .meta-card {
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 12px;
          }

          .meta-label {
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
          }

          .meta-value {
            margin-top: 4px;
            color: #052e16;
            font-weight: bold;
            word-break: break-word;
          }

          .signature-row {
            display: grid;
            grid-template-columns: 1fr 120px 1fr;
            gap: 28px;
            align-items: end;
            margin-top: 34px;
          }

          .signature {
            text-align: center;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }

          .signature img {
            height: 56px;
            object-fit: contain;
            margin-bottom: 4px;
          }

          .sig-line {
            border-top: 2px solid #111827;
            padding-top: 6px;
            font-size: 13px;
            font-weight: bold;
          }

          .seal img {
            width: 110px;
            height: 110px;
            object-fit: contain;
          }

          .seal {
            text-align: center;
            color: #166534;
            font-family: Arial, sans-serif;
            font-size: 11px;
            font-weight: bold;
          }

          .footer {
            position: absolute;
            bottom: 8mm;
            left: 18mm;
            right: 18mm;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            font-size: 11px;
            color: #64748b;
            font-family: Arial, sans-serif;
          }

          @media print {
            body {
              background: #fff;
            }

            .print-button {
              display: none;
            }

            .page {
              margin: 0;
            }
          }
        </style>
      </head>

      <body>
        <button class="print-button" onclick="window.print()">Print / Save PDF</button>

        <div class="page">
          <div class="border">
            <div class="watermark">
              <img src="/intizar-logo.jpg" />
            </div>

            <div class="content">
              <img class="logo" src="/intizar-logo.jpg" />

              <div class="org">INTIZAR Academy</div>
              <div class="subtitle">Official Learning Management System Certificate</div>

              <div class="cert-title">Certificate</div>
              <div class="small-title">of Completion</div>

              <div class="presented">This certificate is proudly presented to</div>

              <div class="student-name">${escapeHtml(cert.studentName)}</div>

              <div class="body-text">
                for successfully completing the requirements of
                <span class="program">${escapeHtml(cert.programName)}</span>
                under INTIZAR Academy, having satisfied the approved assessment,
                payment, and administrative conditions for certification.
              </div>

              <div class="meta-grid">
                <div class="meta-card">
                  <div class="meta-label">Registration No</div>
                  <div class="meta-value">${escapeHtml(cert.regNo || "-")}</div>
                </div>

                <div class="meta-card">
                  <div class="meta-label">Certificate No</div>
                  <div class="meta-value">${escapeHtml(cert.certificateNo)}</div>
                </div>

                <div class="meta-card">
                  <div class="meta-label">Issued Date</div>
                  <div class="meta-value">${escapeHtml(issuedDate)}</div>
                </div>

                <div class="meta-card">
                  <div class="meta-label">Branch</div>
                  <div class="meta-value">${escapeHtml(cert.branch || "-")}</div>
                </div>

                <div class="meta-card">
                  <div class="meta-label">Zone</div>
                  <div class="meta-value">${escapeHtml(cert.zone || "-")}</div>
                </div>

                <div class="meta-card">
                  <div class="meta-label">Verification Token</div>
                  <div class="meta-value">${escapeHtml(cert.verificationToken)}</div>
                </div>
              </div>

              <div class="signature-row">
                <div class="signature">
                  <img src="/certificates/secretary-signature.png" onerror="this.style.display='none'" />
                  <div class="sig-line">Secretary Signature</div>
                </div>

                <div class="seal">
                  <img src="/certificates/intizar-seal.png" onerror="this.style.display='none'" />
                  <div>Official Seal</div>
                </div>

                <div class="signature">
                  <img src="/certificates/director-signature.png" onerror="this.style.display='none'" />
                  <div class="sig-line">Director / Coordinator Signature</div>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div>Status: ${escapeHtml(cert.status.toUpperCase())}</div>
            <div>Verify using Certificate No and Verification Token</div>
          </div>
        </div>
      </body>
    </html>
  `);

  win.document.close();
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCard}>
      <div style={{fontSize:12,color:C.muted,fontWeight:900}}>{label}</div>
      <div style={{fontSize:15,color:C.text,fontWeight:900,marginTop:5}}>{value}</div>
    </div>
  );
}

function Badge({ label, good = false }: { label: string; good?: boolean }) {
  return (
    <span style={{
      display:"inline-flex",
      padding:"8px 12px",
      borderRadius:999,
      background: good ? "#dcfce7" : "#fee2e2",
      color: good ? "#166534" : "#991b1b",
      fontWeight:900,
      fontSize:12,
    }}>
      {label}
    </span>
  );
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const toolbar: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"220px 1fr auto",
  gap:12,
  alignItems:"center",
  marginTop:16,
};

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid "+C.border,
  borderRadius:10,
  background:"#fff",
};

const rulesBox: CSSProperties = {
  border:"1px solid #bbf7d0",
  background:"#f0fdf4",
  borderRadius:14,
  padding:14,
  color:"#166534",
  lineHeight:1.7,
  fontSize:14,
};

const topRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"start",
  gap:16,
  flexWrap:"wrap",
};

const studentName: CSSProperties = {
  margin:"0 0 5px",
  color:C.text,
  fontSize:22,
  fontWeight:900,
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:4,
};

const grid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:12,
  marginTop:16,
};

const infoCard: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#f8fafc",
};

const blockedBox: CSSProperties = {
  border:"1px solid #fecaca",
  background:"#fef2f2",
  borderRadius:14,
  padding:14,
  marginTop:16,
  color:"#991b1b",
  lineHeight:1.6,
};

const certBox: CSSProperties = {
  border:"1px solid #bbf7d0",
  background:"#f0fdf4",
  borderRadius:14,
  padding:14,
  marginTop:16,
  color:"#166534",
  lineHeight:1.6,
};

const emptyState: CSSProperties = {
  minHeight:120,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
};

