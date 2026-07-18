import { useEffect, useMemo, useState, type CSSProperties } from "react";
import * as QRCode from "qrcode";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import { DEFAULT_SETTINGS, loadAppSettings, type AppSettings } from "../../lib/settingsApi";

let CERTIFICATE_SETTINGS: AppSettings = DEFAULT_SETTINGS;
import {
  createCertificate,
  loadCertificates,
  makeCertificateNo,
  revokeCertificate,
  type CertificateRecord,
} from "../../lib/certificateApi";
import { loadApplications, type ApplicationRecord } from "../../lib/applicationApi";
import { loadCourseResults, type StudentCourseResult } from "../../lib/scoreApi";
import {
  createRemedialPayment,
  loadRemedialPayments,
  remedialAmount,
  rejectRemedialPayment,
  verifyRemedialPayment,
  type RemedialPayment,
} from "../../lib/remedialApi";

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
  const courses = data?.courses ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const attendance = data?.attendance ?? [];

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [remedialPayments, setRemedialPayments] = useState<RemedialPayment[]>([]);
  const [courseResults, setCourseResults] = useState<StudentCourseResult[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsView, setSettingsView] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dbEligibilityChecks, setDbEligibilityChecks] = useState<Record<string, any>>({});
  const [checkingEligibility, setCheckingEligibility] = useState<string | null>(null);

  const students = users.filter((u: any) => u.role === "student");

  async function refresh() {
    const [certs, apps, remedials, results] = await Promise.all([
      loadCertificates(),
      loadApplications().then(res => res.applications).catch(() => []),
      loadRemedialPayments().catch(() => []),
      loadCourseResults().catch(() => []),
    ]);

    setCertificates(certs);
    setApplications(apps);
    setRemedialPayments(remedials);
    setCourseResults(results);
  }

  useEffect(() => {
    loadAppSettings().then((loaded) => { CERTIFICATE_SETTINGS = loaded; setSettingsView(loaded); }).catch(() => { CERTIFICATE_SETTINGS = DEFAULT_SETTINGS; setSettingsView(DEFAULT_SETTINGS); });
    refresh().catch(err => alert(err?.message || "Could not load certificates."));
  }, []);

  function programName(id?: string | null) {
    if (!id) return "-";
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function courseName(id?: string | null) {
    if (!id) return "Unknown Course";
    return courses.find((c: any) => c.id === id)?.name || "Unknown Course";
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

  function latestRemedialPayment(studentId: string) {
    return remedialPayments.find(p => p.studentId === studentId) || null;
  }

  function unpaidRemedialPayments(studentId: string) {
    return remedialPayments.filter(p =>
      p.studentId === studentId &&
      p.status !== "verified"
    );
  }

  function averageGrade(studentId: string) {
    const list = courseResults.filter(result =>
      result.studentId === studentId &&
      result.assessmentComplete
    );

    if (!list.length) return null;

    return Math.round(
      list.reduce((sum, result) => sum + Number(result.finalGrade || 0), 0) / list.length
    );
  }

  function failedCourses(studentId: string) {
    return courseResults
      .filter(result =>
        result.studentId === studentId &&
        result.assessmentComplete &&
        result.status === "failed"
      )
      .map(result => ({
        courseId: result.courseId,
        courseName: courseName(result.courseId),
        average: result.finalGrade,
        required: result.passMark,
      }));
  }

  function attendanceInfo(studentId: string) {
    const list = attendance.filter((a: any) => a.studentId === studentId);

    if (!list.length) {
      return {
        percent: null as number | null,
        badCount: 0,
        refresherRequired: false,
      };
    }

    const good = list.filter((a: any) => {
      const status = String(a.status || "").toLowerCase();
      return status === "present" || status === "late" || status === "excused";
    }).length;

    const badCount = list.length - good;
    const percent = Math.round((good / list.length) * 100);

    return {
      percent,
      badCount,
      refresherRequired: percent < REQUIRED_ATTENDANCE && badCount > 0,
    };
  }

  function eligibility(student: any) {
    const app = studentApplication(student.id);
    const group = studentGroup(student.id);
    const avg = averageGrade(student.id);
    const att = attendanceInfo(student.id);
    const failed = failedCourses(student.id);
    const latestRemedial = latestRemedialPayment(student.id);
    const unpaidRemedials = unpaidRemedialPayments(student.id);

    const reasons: string[] = [];

    if (!group) {
      reasons.push("Student is not approved in any group.");
    }

    if (avg === null) {
      reasons.push("No assessment/grade record found.");
    } else if (avg < REQUIRED_OVERALL) {
      reasons.push(`Overall assessment is ${avg}%, required ${REQUIRED_OVERALL}%.`);
    }

    if (failed.length > 0) {
      const amount = remedialAmount(failed.length);

      reasons.push(
        `Failed ${failed.length} course(s): ${failed.map(c => c.courseName + " (" + c.average + "%)").join(", ")}.`
      );

      if (!latestRemedial) {
        reasons.push(`Remedial payment must be generated. Amount: ₦${amount.toLocaleString()}.`);
      } else if (latestRemedial.status !== "verified") {
        reasons.push(`Remedial payment is not verified. Status: ${latestRemedial.status}.`);
      } else {
        reasons.push("Remedial payment is verified, but failed assessment is not yet cleared.");
      }
    }

    if (failed.length === 0 && unpaidRemedials.length > 0) {
      reasons.push("There is an existing remedial payment that has not been verified.");
    }

    if (att.refresherRequired) {
      reasons.push(
        `Attendance is ${att.percent}%, required ${REQUIRED_ATTENDANCE}%. No payment option. Student must enroll in Refresher Program.`
      );
    }

    if (app && !(app.paymentStatus === "paid" && app.applicationStatus === "approved")) {
      reasons.push("Application payment or approval is not complete.");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      average: avg,
      attendance: att.percent,
      badAttendanceCount: att.badCount,
      refresherRequired: att.refresherRequired,
      failedCourses: failed,
      remedialAmount: remedialAmount(failed.length),
      latestRemedial,
      unpaidRemedials,
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
        if (filter === "remedial" && row.eligibility.failedCourses.length === 0) return false;
        if (filter === "refresher" && !row.eligibility.refresherRequired) return false;

        if (!q) return true;

        return (
          String(row.student.name || "").toLowerCase().includes(q) ||
          String(row.student.email || "").toLowerCase().includes(q) ||
          String(row.eligibility.regNo || "").toLowerCase().includes(q) ||
          certStatus.includes(q)
        );
      });
  }, [students, certificates, applications, remedialPayments, courseResults, attendance, search, filter]);

  function eligibilityCheckKey(studentId: string, programId?: string | null, groupId?: string | null) {
    return [studentId, programId || "no-program", groupId || "no-group"].join(":");
  }

  function eligibilityAlertText(snapshot: any) {
    const courses = snapshot?.courses ?? [];
    const badCourses = courses.filter((course: any) => !course.eligible_course);

    const lines = [
      snapshot?.reason || "Certificate eligibility check failed.",
      "",
      "Summary:",
      "Required courses: " + (snapshot?.required_course_count ?? 0),
      "Passed courses: " + (snapshot?.passed_count ?? 0),
      "Complete courses: " + (snapshot?.complete_count ?? 0),
      "Missing results: " + (snapshot?.missing_count ?? 0),
      "Failed/incomplete: " + (snapshot?.failed_count ?? 0),
    ];

    if (badCourses.length) {
      lines.push("", "Courses to fix:");
      badCourses.slice(0, 8).forEach((course: any) => {
        lines.push("- " + course.course_name + " | status: " + (course.status || "missing") + " | grade: " + (course.final_grade ?? "-"));
      });
    }

    return lines.join("\n");
  }

  async function checkDbEligibility(student: any, silent = false) {
    const e = eligibility(student);
    const programId = e.programId;
    const groupId = e.group?.id || null;

    if (!programId || !groupId) {
      const result = {
        eligible: false,
        reason: "Student must have a program and approved group before certificate eligibility can be checked.",
        courses: [],
      };

      const key = eligibilityCheckKey(student.id, programId, groupId);

      setDbEligibilityChecks(prev => ({
        ...prev,
        [key]: result,
      }));

      if (!silent) alert(result.reason);

      return result;
    }

    try {
      setCheckingEligibility(student.id);

      const { data, error } = await (supabase as any).rpc("check_certificate_eligibility", {
        p_student_id: student.id,
        p_program_id: programId,
        p_group_id: groupId,
      });

      if (error) throw error;

      const key = eligibilityCheckKey(student.id, programId, groupId);

      setDbEligibilityChecks(prev => ({
        ...prev,
        [key]: data,
      }));

      if (!silent) {
        alert(data?.eligible ? "Student is eligible for certificate." : eligibilityAlertText(data));
      }

      return data;
    } catch (err: any) {
      if (!silent) alert(err?.message || "Could not check certificate eligibility.");
      throw err;
    } finally {
      setCheckingEligibility(null);
    }
  }

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

    const dbEligibility = await checkDbEligibility(student, true);

    if (!dbEligibility?.eligible) {
      alert("Certificate blocked by auto-check:\n\n" + eligibilityAlertText(dbEligibility));
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
          autoCheck: dbEligibility,
          legacyCheck: {
            requiredOverall: REQUIRED_OVERALL,
            requiredAttendance: REQUIRED_ATTENDANCE,
            average: e.average,
            attendance: e.attendance,
            failedCourses: e.failedCourses,
            remedialPayment: e.latestRemedial,
            refresherRequired: e.refresherRequired,
            group: e.group?.name || null,
            paymentStatus: e.application?.paymentStatus || "legacy/manual student",
            applicationStatus: e.application?.applicationStatus || "legacy/manual student",
          },
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

  async function generateRemedial(student: any) {
    const e = eligibility(student);

    if (e.refresherRequired) {
      alert("No remedial payment is allowed. Student must enroll in Refresher Program because of attendance.");
      return;
    }

    if (e.failedCourses.length === 0) {
      alert("No failed course found.");
      return;
    }

    if (e.latestRemedial && e.latestRemedial.status !== "rejected") {
      alert("A remedial payment already exists for this student.");
      return;
    }

    const ok = confirm(
      `Generate remedial payment for ${student.name}?\n\nFailed courses: ${e.failedCourses.length}\nAmount: ₦${e.remedialAmount.toLocaleString()}`
    );

    if (!ok) return;

    try {
      setBusy(true);

      await createRemedialPayment({
        studentId: student.id,
        programId: e.programId,
        groupId: e.group?.id || null,
        failedCourses: e.failedCourses,
        createdBy: user.id,
      });

      await refresh();
      alert("Remedial payment generated.");
    } catch (err: any) {
      alert(err?.message || "Could not generate remedial payment.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRemedial(payment: RemedialPayment) {
    const note = prompt("Admin note for remedial payment verification:") || "";

    try {
      setBusy(true);
      await verifyRemedialPayment({
        paymentId: payment.id,
        verifiedBy: user.id,
        note,
      });

      await refresh();
      alert("Remedial payment verified.");
    } catch (err: any) {
      alert(err?.message || "Could not verify remedial payment.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectRemedial(payment: RemedialPayment) {
    const note = prompt("Reason for rejecting remedial payment:");

    if (!note) return;

    try {
      setBusy(true);
      await rejectRemedialPayment({
        paymentId: payment.id,
        verifiedBy: user.id,
        note,
      });

      await refresh();
      alert("Remedial payment rejected.");
    } catch (err: any) {
      alert(err?.message || "Could not reject remedial payment.");
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
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:C.text}}>Remedial Rule From Settings</h2>

        <p style={{margin:"8px 0 0",color:C.muted,lineHeight:1.7}}>
          {settingsView.remedialRuleNote}
        </p>

        <div style={{
          marginTop:14,
          padding:14,
          borderRadius:14,
          border:"1px solid #dcfce7",
          background:"#f0fdf4",
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:10
        }}>
          <div><strong>Bank:</strong> {settingsView.bankName || "Not set yet"}</div>
          <div><strong>Account Name:</strong> {settingsView.accountName || "Not set yet"}</div>
          <div><strong>Account Number:</strong> {settingsView.accountNumber || "Not set yet"}</div>
        </div>
      </Card>

      <Card>
        <div style={rulesBox}>
          <strong>Certificate Blocking Rules</strong>
          <div>Overall assessment required: {REQUIRED_OVERALL}%</div>
          <div>1 failed course remedial fee: ₦200</div>
          <div>More than 1 failed course: ₦250 per failed course</div>
          <div>Attendance failure without valid excuse: no payment option, student must enroll in Refresher Program</div>
          <div>Student must be approved in a group</div>
        </div>

        <div style={toolbar}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
            <option value="all">All students</option>
            <option value="eligible">Eligible only</option>
            <option value="blocked">Blocked only</option>
            <option value="remedial">Needs remedial payment</option>
            <option value="refresher">Needs refresher program</option>
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
          const remedial = e.latestRemedial;
          const checkKey = eligibilityCheckKey(student.id, e.programId, e.group?.id || null);
          const dbEligibility = dbEligibilityChecks[checkKey];

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
                <Info label="Failed Courses" value={String(e.failedCourses.length)} />
                <Info label="Remedial Amount" value={e.failedCourses.length ? "₦" + e.remedialAmount.toLocaleString() : "-"} />
                <Info label="Payment" value={e.application ? e.application.paymentStatus : "Legacy/manual"} />
                <Info label="Application" value={e.application ? e.application.applicationStatus : "Legacy/manual"} />
              </div>

              {e.refresherRequired && (
                <div style={refresherBox}>
                  <strong>Refresher Program Required</strong>
                  <p>
                    Attendance is below the required level with lost attendance/no valid excuse.
                    No payment option is allowed. This student must enroll in Refresher Program.
                  </p>
                </div>
              )}

              {e.failedCourses.length > 0 && (
                <div style={remedialBox}>
                  <strong>Remedial Course Payment</strong>
                  <div style={meta}>Failed courses: {e.failedCourses.map((c: any) => `${c.courseName} (${c.average}%)`).join(", ")}</div>
                  <div style={meta}>Amount: ₦{e.remedialAmount.toLocaleString()}</div>

                  {remedial ? (
                    <>
                      <div style={meta}>Reference: {remedial.paymentReference}</div>
                      <div style={meta}>Status: {remedial.status}</div>

                      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
                        {remedial.status !== "verified" && (
                          <>
                            <Button onClick={() => verifyRemedial(remedial)} disabled={busy}>
                              Verify Remedial Payment
                            </Button>

                            <Button variant="danger" onClick={() => rejectRemedial(remedial)} disabled={busy}>
                              Reject Remedial Payment
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{marginTop:12}}>
                      <Button onClick={() => generateRemedial(student)} disabled={busy || e.refresherRequired}>
                        Generate Remedial Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}

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

              {dbEligibility && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid " + (dbEligibility.eligible ? "#bbf7d0" : "#fecaca"),
                  background: dbEligibility.eligible ? "#f0fdf4" : "#fef2f2",
                  color: "#0f172a"
                }}>
                  <strong>Auto Eligibility Check: {dbEligibility.eligible ? "Eligible" : "Blocked"}</strong>
                  <div style={meta}>{dbEligibility.reason}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10}}>
                    <Info label="Required Courses" value={String(dbEligibility.required_course_count ?? 0)} />
                    <Info label="Passed" value={String(dbEligibility.passed_count ?? 0)} />
                    <Info label="Complete" value={String(dbEligibility.complete_count ?? 0)} />
                    <Info label="Missing" value={String(dbEligibility.missing_count ?? 0)} />
                    <Info label="Failed/Incomplete" value={String(dbEligibility.failed_count ?? 0)} />
                  </div>

                  {(dbEligibility.courses ?? []).length > 0 && (
                    <div style={{marginTop:10}}>
                      <strong>Course Check</strong>
                      <ul style={{margin:"8px 0 0",paddingLeft:18}}>
                        {(dbEligibility.courses ?? []).map((course: any) => (
                          <li key={course.course_id}>
                            {course.course_name}: {course.eligible_course ? "OK" : "Not complete"} 
                            {course.final_grade !== null && course.final_grade !== undefined ? " | " + course.final_grade + "%" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                  <>
                    <Button onClick={() => checkDbEligibility(student)} disabled={busy || checkingEligibility === student.id}>
                      {checkingEligibility === student.id ? "Checking..." : "Check Eligibility"}
                    </Button>

                    <Button onClick={() => generate(student)} disabled={busy || !e.eligible || (dbEligibility && !dbEligibility.eligible)}>
                      Generate Certificate
                    </Button>
                  </>
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

function certificateVerifyUrl(cert: CertificateRecord) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    verifyCertificate: "1",
    certificateNo: cert.certificateNo,
    token: cert.verificationToken,
  });

  return `${base}?${params.toString()}`;
}

async function printCertificate(cert: CertificateRecord) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15, 23, 42, 0.72)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";

  const toolbar = document.createElement("div");
  toolbar.style.background = "#ffffff";
  toolbar.style.padding = "10px 14px";
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.borderBottom = "1px solid #e2e8f0";
  toolbar.innerHTML = '<strong>Certificate Preview</strong><span style="color:#64748b;font-size:13px">Use Print / Save as PDF inside the certificate.</span>';

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.padding = "8px 14px";
  closeButton.style.border = "0";
  closeButton.style.borderRadius = "10px";
  closeButton.style.background = "#dc2626";
  closeButton.style.color = "#fff";
  closeButton.style.fontWeight = "800";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => overlay.remove();

  toolbar.appendChild(closeButton);

  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.background = "#ffffff";

  overlay.appendChild(toolbar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  const win = iframe.contentWindow;
  const doc = win?.document;

  if (!win || !doc) {
    alert("Could not open certificate preview. Please try again.");
    overlay.remove();
    return;
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString();
  const verifyUrl = certificateVerifyUrl(cert);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 170,
    margin: 1,
  });

  const autoCheck = cert.eligibilitySnapshot?.autoCheck || {};
  const legacyCheck = cert.eligibilitySnapshot?.legacyCheck || {};

  const completedProgram = autoCheck?.program?.name || cert.programName || "-";
  const regNoText = autoCheck?.student?.reg_no || cert.regNo || "-";
  const branchText = autoCheck?.student?.branch || cert.branch || "-";
  const zoneText = autoCheck?.student?.zone || cert.zone || "-";

  const averageValue = autoCheck?.overall_average ?? legacyCheck?.average ?? null;
  const averageNumber = Number(averageValue || 0);

  const cgpaValue = autoCheck?.cgpa ?? (
    averageValue !== null && averageValue !== undefined && !Number.isNaN(Number(averageValue))
      ? (Number(averageValue) / 100) * 5
      : null
  );

  const cgpaText =
    cgpaValue === null || cgpaValue === undefined || Number.isNaN(Number(cgpaValue))
      ? "-"
      : Number(cgpaValue).toFixed(2);

  const classText =
    autoCheck?.class_of_completion ||
    (
      averageNumber >= 90 ? "First Class" :
      averageNumber >= 80 ? "Second Class" :
      averageNumber >= 70 ? "Third Class" :
      "Not eligible"
    );

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${escapeHtml(cert.certificateNo)}</title>
        <style>
          @page { size: A4 landscape; margin: 0; }

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
            padding: 11mm;
          }

          .border {
            border: 4px double #166534;
            height: 100%;
            box-sizing: border-box;
            padding: 7mm 10mm;
            position: relative;
          }

          .watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.045;
            z-index: 0;
          }

          .watermark img {
            width: 330px;
            height: 330px;
            object-fit: contain;
          }

          .content {
            position: relative;
            z-index: 2;
            height: 100%;
            display: grid;
            grid-template-rows: auto auto auto auto auto auto;
            row-gap: 6px;
            text-align: center;
          }

          .logo {
            width: 42px;
            height: 42px;
            object-fit: contain;
            margin: 0 auto 2px;
          }

          .official-name-img {
            width: 245px;
            max-height: 58px;
            object-fit: contain;
            display: block;
            margin: 0 auto 1px;
          }

          .official-name-fallback {
            font-size: 22px;
            font-weight: 900;
            color: #059669;
            line-height: 1.1;
          }

          .official-name-fallback span {
            color: #1e3a8a;
            font-size: 15px;
          }

          .org-en {
            font-size: 12px;
            font-weight: 800;
            color: #052e16;
            margin-top: 1px;
          }

          .cert-title {
            margin-top: 3px;
            font-size: 33px;
            font-weight: 900;
            color: #166534;
            letter-spacing: 3px;
            text-transform: uppercase;
          }

          .small-title {
            margin-top: 0;
            font-size: 15px;
            color: #334155;
          }

          .presented {
            margin-top: 5px;
            font-size: 14px;
            color: #475569;
          }

          .student-name {
            margin: 5px auto 3px;
            font-size: 31px;
            font-weight: 900;
            color: #111827;
            border-bottom: 2px solid #166534;
            display: inline-block;
            padding: 0 24px 4px;
          }

          .body-text {
            margin: 4px auto 0;
            max-width: 920px;
            font-size: 13.5px;
            line-height: 1.4;
            color: #334155;
          }

          .program {
            font-weight: 900;
            color: #052e16;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-top: 5px;
            font-family: Arial, sans-serif;
            text-align: left;
          }

          .meta-card {
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            border-radius: 9px;
            padding: 6px 8px;
            min-height: 42px;
            box-sizing: border-box;
          }

          .meta-label {
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8.5px;
          }

          .meta-value {
            margin-top: 3px;
            color: #052e16;
            font-weight: bold;
            word-break: break-word;
            font-size: 10.5px;
            line-height: 1.2;
          }

          .bottom-row {
            display: grid;
            grid-template-columns: 1.05fr 1fr;
            gap: 10px;
            align-items: end;
            margin-top: 4px;
          }

          .qr-section {
            display: grid;
            grid-template-columns: 76px 1fr;
            gap: 9px;
            align-items: center;
            font-family: Arial, sans-serif;
            text-align: left;
            border: 1px solid #bbf7d0;
            background: #f8fffb;
            border-radius: 10px;
            padding: 7px;
            min-height: 86px;
            box-sizing: border-box;
          }

          .qr-section img {
            width: 68px;
            height: 68px;
            border: 1px solid #bbf7d0;
            padding: 3px;
            border-radius: 8px;
            background: #fff;
          }

          .qr-text {
            text-align: left;
            font-size: 8.8px;
            color: #475569;
            line-height: 1.25;
          }

          .qr-text strong {
            color: #052e16;
            display: block;
            font-size: 10.5px;
            margin-bottom: 2px;
          }

          .verify-url {
            word-break: break-all;
            font-size: 7.6px;
            color: #64748b;
            margin-top: 3px;
          }

          .signature-row {
            display: grid;
            grid-template-columns: 1fr 64px 1fr;
            gap: 9px;
            align-items: end;
            min-height: 86px;
          }

          .signature {
            text-align: center;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }

          .signature img {
            height: 42px;
            max-width: 135px;
            object-fit: contain;
            margin-bottom: 2px;
          }

          .sig-line {
            border-top: 2px solid #111827;
            padding-top: 3px;
            font-size: 10px;
            font-weight: bold;
            line-height: 1.15;
          }

          .seal {
            text-align: center;
            color: #166534;
            font-family: Arial, sans-serif;
            font-size: 9px;
            font-weight: bold;
          }

          .seal img {
            width: 54px;
            height: 54px;
            object-fit: contain;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            font-size: 8.5px;
            color: #64748b;
            font-family: Arial, sans-serif;
            margin-top: 2px;
          }

          @media print {
            body { background: #fff; }
            .print-button { display: none; }
            .page { margin: 0; }
          }
        </style>
      </head>

      <body>
        <button class="print-button" onclick="window.print()">Print / Save as PDF</button>

        <div class="page">
          <div class="border">
            <div class="watermark"><img src="/intizar-logo.jpg" /></div>

            <div class="content">
              <div>
                <img class="logo" src="/intizar-logo.jpg" />
                <img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="official-name-fallback" style="display:none">انتظار الامام المنتظر<br/><span>(تربین روح د غنغن حكي)</span></div>
                <div class="org-en">${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>
              </div>

              <div>
                <div class="cert-title">Certificate</div>
                <div class="small-title">of Completion</div>
              </div>

              <div>
                <div class="presented">This certificate is proudly presented to</div>
                <div class="student-name">${escapeHtml(cert.studentName)}</div>
              </div>

              <div class="body-text">
                This is to certify that the above-named student has successfully completed the
                <span class="program">${escapeHtml(completedProgram)}</span>
                under ${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}, and has met the approved academic
                requirements for the award of this certificate.
              </div>

              <div class="meta-grid">
                <div class="meta-card"><div class="meta-label">Registration No</div><div class="meta-value">${escapeHtml(regNoText)}</div></div>
                <div class="meta-card"><div class="meta-label">Program Completed</div><div class="meta-value">${escapeHtml(completedProgram)}</div></div>
                <div class="meta-card"><div class="meta-label">Branch</div><div class="meta-value">${escapeHtml(branchText)}</div></div>
                <div class="meta-card"><div class="meta-label">Zone</div><div class="meta-value">${escapeHtml(zoneText)}</div></div>
                <div class="meta-card"><div class="meta-label">CGPA</div><div class="meta-value">${escapeHtml(cgpaText)} / 5.00</div></div>
                <div class="meta-card"><div class="meta-label">Class of Completion</div><div class="meta-value">${escapeHtml(classText)}</div></div>
                <div class="meta-card"><div class="meta-label">Certificate No</div><div class="meta-value">${escapeHtml(cert.certificateNo)}</div></div>
                <div class="meta-card"><div class="meta-label">Issued Date</div><div class="meta-value">${escapeHtml(issuedDate)}</div></div>
              </div>

              <div class="bottom-row">
                <div class="qr-section">
                  <img src="${qrDataUrl}" />
                  <div class="qr-text">
                    <strong>Official Verification</strong>
                    Scan the QR code or verify using certificate number and verification token.
                    <div style="margin-top:3px;"><strong>Token:</strong> ${escapeHtml(cert.verificationToken)}</div>
                    <div class="verify-url">${escapeHtml(verifyUrl)}</div>
                  </div>
                </div>

                <div class="signature-row">
                  <div class="signature">
                    <img src="/certificates/intizar-secretary-signature.png" onerror="this.style.display='none'" />
                    <div class="sig-line">INTIZAR Secretary</div>
                  </div>

                  <div class="seal">
                    <img src="${CERTIFICATE_SETTINGS.sealUrl}" onerror="this.style.display='none'" />
                    <div>Official Seal</div>
                  </div>

                  <div class="signature">
                    <img src="${CERTIFICATE_SETTINGS.directorSignatureUrl}" onerror="this.style.display='none'" />
                    <div class="sig-line">Director / Coordinator</div>
                  </div>
                </div>
              </div>

              <div class="footer">
                <div>Status: VALID</div>
                <div>Verify using Certificate No and Verification Token</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();
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

const toolbar: CSSProperties = {display:"grid",gridTemplateColumns:"240px 1fr auto",gap:12,alignItems:"center",marginTop:16};
const selectStyle: CSSProperties = {padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10,background:"#fff"};
const rulesBox: CSSProperties = {border:"1px solid #bbf7d0",background:"#f0fdf4",borderRadius:14,padding:14,color:"#166534",lineHeight:1.7,fontSize:14};
const topRow: CSSProperties = {display:"flex",justifyContent:"space-between",alignItems:"start",gap:16,flexWrap:"wrap"};
const studentName: CSSProperties = {margin:"0 0 5px",color:C.text,fontSize:22,fontWeight:900};
const meta: CSSProperties = {fontSize:13,color:C.muted,marginTop:4};
const grid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:16};
const infoCard: CSSProperties = {border:"1px solid "+C.border,borderRadius:14,padding:14,background:"#f8fafc"};
const blockedBox: CSSProperties = {border:"1px solid #fecaca",background:"#fef2f2",borderRadius:14,padding:14,marginTop:16,color:"#991b1b",lineHeight:1.6};
const remedialBox: CSSProperties = {border:"1px solid #fde68a",background:"#fffbeb",borderRadius:14,padding:14,marginTop:16,color:"#92400e",lineHeight:1.6};
const refresherBox: CSSProperties = {border:"1px solid #fed7aa",background:"#fff7ed",borderRadius:14,padding:14,marginTop:16,color:"#9a3412",lineHeight:1.6};
const certBox: CSSProperties = {border:"1px solid #bbf7d0",background:"#f0fdf4",borderRadius:14,padding:14,marginTop:16,color:"#166534",lineHeight:1.6};
const emptyState: CSSProperties = {minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",color:C.muted};








