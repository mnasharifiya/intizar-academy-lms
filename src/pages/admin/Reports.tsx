import { useEffect, useState, type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  loadApplications,
  type ApplicationPayment,
  type ApplicationRecord,
} from "../../lib/applicationApi";

export default function AdminReports({
  user,
  data,
}: {
  user?: any;
  data: any;
}) {
  const users = data?.users ?? [];
  const groups = data?.groups ?? [];
  const levels = data?.levels ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const lectures = data?.lectures ?? [];
  const attendance = data?.attendance ?? [];
  const assignments = data?.assignments ?? [];
  const submissions = data?.submissions ?? [];
  const grades = data?.grades ?? [];
  const videos = data?.videos ?? [];
  const materials = data?.learningMaterials ?? [];
  const adminGroups = data?.adminGroups ?? [];

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [payments, setPayments] = useState<ApplicationPayment[]>([]);

  const currentAdminLinks = adminGroups.filter((ag: any) => ag.adminId === user?.id);
  const isRestrictedAdmin = user?.role === "admin" && currentAdminLinks.length > 0;
  const isMainController = user?.role === "admin" && currentAdminLinks.length === 0;

  useEffect(() => {
    if (!isMainController) return;

    loadApplications()
      .then(res => {
        setApplications(res.applications);
        setPayments(res.payments);
      })
      .catch(err => console.warn("Application report load failed:", err));
  }, [isMainController]);

  const students = users.filter((u: any) => u.role === "student");
  const instructors = users.filter((u: any) => u.role === "instructor");
  const admins = users.filter((u: any) => u.role === "admin");

  function userName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function levelName(id: string) {
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function groupMembers(groupId: string) {
    return groupStudents
      .filter((gs: any) => gs.groupId === groupId && gs.status !== "rejected")
      .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
      .filter(Boolean);
  }

  function gradesForStudent(studentId: string) {
    return grades.filter((g: any) => g.studentId === studentId);
  }

  function avgGradeForStudent(studentId: string) {
    const list = gradesForStudent(studentId);
    if (!list.length) return null;
    return Math.round(list.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / list.length);
  }

  function attendanceForStudent(studentId: string) {
    return attendance.filter((a: any) => a.studentId === studentId);
  }

  function attendancePercentForStudent(studentId: string) {
    const list = attendanceForStudent(studentId);
    if (!list.length) return null;

    const good = list.filter(
      (a: any) => a.status === "present" || a.status === "late" || a.status === "excused"
    ).length;

    return Math.round((good / list.length) * 100);
  }

  function groupAssignments(groupId: string) {
    return assignments.filter((a: any) => a.groupId === groupId);
  }

  function groupSubmissionRate(groupId: string) {
    const groupAss = groupAssignments(groupId);
    const members = groupMembers(groupId);
    const expected = groupAss.length * members.length;
    if (!expected) return null;

    const submitted = submissions.filter((s: any) =>
      groupAss.some((a: any) => a.id === s.assignmentId)
    ).length;

    return Math.round((submitted / expected) * 100);
  }

  function groupAttendanceAverage(groupId: string) {
    const values = groupMembers(groupId)
      .map((s: any) => attendancePercentForStudent(s.id))
      .filter((v: any) => v !== null);

    if (!values.length) return null;
    return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
  }

  function groupGradeAverage(groupId: string) {
    const values = groupMembers(groupId)
      .map((s: any) => avgGradeForStudent(s.id))
      .filter((v: any) => v !== null);

    if (!values.length) return null;
    return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
  }

  function courseGradeAverage(courseId: string) {
    const courseAssignments = assignments.filter((a: any) => a.courseId === courseId);
    const courseLectures = lectures.filter((l: any) => l.courseId === courseId);

    const list = grades.filter((g: any) =>
      courseAssignments.some((a: any) => a.id === g.assignmentId) ||
      courseLectures.some((l: any) => l.id === g.lectureId)
    );

    if (!list.length) return null;

    return Math.round(list.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / list.length);
  }

  function courseStudentCount(courseId: string) {
    const levelIds = levelCourses
      .filter((lc: any) => lc.courseId === courseId)
      .map((lc: any) => lc.levelId);

    return students.filter((s: any) => levelIds.includes(s.levelId)).length;
  }
  const reportScopeRows = groups.map((group: any) => ({
    group: group.name,
    program: levelName(group.levelId),
    instructor: userName(group.instructorId),
    students: groupMembers(group.id).length,
    capacity: group.maxStudents,
    status: group.isActive ? "Active" : "Inactive",
  }));

  const userRows = [
    { role: "Admin", count: admins.length },
    { role: "Instructor", count: instructors.length },
    { role: "Student", count: students.length },
    { role: "Total", count: users.length },
  ];

  const groupRows = groups.map((group: any) => ({
    group: group.name,
    program: levelName(group.levelId),
    instructor: userName(group.instructorId),
    students: groupMembers(group.id).length,
    capacity: group.maxStudents,
    attendanceAverage: displayPercent(groupAttendanceAverage(group.id)),
    gradeAverage: displayPercent(groupGradeAverage(group.id)),
    submissionRate: displayPercent(groupSubmissionRate(group.id)),
    status: group.isActive ? "Active" : "Inactive",
  }));

  const courseRows = courses.map((course: any) => ({
    course: course.name,
    assignedPrograms: levelCourses.filter((lc: any) => lc.courseId === course.id).length,
    students: courseStudentCount(course.id),
    lectures: lectures.filter((l: any) => l.courseId === course.id).length,
    assignments: assignments.filter((a: any) => a.courseId === course.id).length,
    videos: videos.filter((v: any) => v.courseId === course.id).length,
    materials: materials.filter((m: any) => m.courseId === course.id).length,
    gradeAverage: displayPercent(courseGradeAverage(course.id)),
  }));

  const atRiskRows = students
    .map((student: any) => {
      const avg = avgGradeForStudent(student.id);
      const att = attendancePercentForStudent(student.id);
      const mySubmissions = submissions.filter((s: any) => s.studentId === student.id).length;

      const myMembership = groupStudents.find((gs: any) => gs.studentId === student.id);
      const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);
      const myAssignments = myGroup ? assignments.filter((a: any) => a.groupId === myGroup.id) : [];
      const missingSubmissions = Math.max(0, myAssignments.length - mySubmissions);

      const riskReasons = [
        avg !== null && avg < 50 ? "Low grade average" : "",
        att !== null && att < 60 ? "Low attendance" : "",
        missingSubmissions > 0 ? "Missing submissions" : "",
        !myGroup ? "No group assigned" : "",
      ].filter(Boolean);

      return {
        student: student.name,
        email: student.email,
        program: levelName(student.levelId),
        group: myGroup?.name || "-",
        gradeAverage: displayPercent(avg),
        attendance: displayPercent(att),
        missingSubmissions,
        riskReason: riskReasons.join(", ") || "Normal",
      };
    })
    .filter((row: any) => row.riskReason !== "Normal");

  const applicationRows = applications.map(app => ({
    applicationNo: app.applicationNo,
    applicant: app.fullName,
    email: app.email,
    phone: app.phoneNo,
    zone: app.zone,
    branch: app.branch,
    workInBranch: app.workInBranch,
    program: levelName(app.finalProgramId || app.programId),
    amount: formatMoney(app.applicationFee),
    paymentReference: app.paymentReference,
    paymentStatus: app.paymentStatus,
    applicationStatus: app.applicationStatus,
    submittedAt: formatDate(app.createdAt),
  }));

  const paymentRows = payments.map(payment => {
    const app = applications.find(a => a.id === payment.applicationId);
    return {
      paymentCategory: "Application / Enrollment Fee",
      applicant: app?.fullName || "-",
      applicationNo: app?.applicationNo || "-",
      paymentReference: payment.paymentReference,
      transactionReference: payment.transactionReference || "-",
      payerName: payment.payerName || "-",
      bankName: payment.bankName || "-",
      amountPaid: formatMoney(payment.amount),
      paymentStatus: payment.status,
      paymentSubmittedAt: formatDate(payment.createdAt),
      verifiedAt: formatDate(payment.verifiedAt),
    };
  });

  const enrolledRows = applications
    .filter(app => app.applicationStatus === "approved")
    .map(app => ({
      studentOrApplicant: app.fullName,
      email: app.email,
      phone: app.phoneNo,
      branch: app.branch,
      program: levelName(app.finalProgramId || app.programId),
      regNo: app.finalRegNo || app.suggestedRegNo || "-",
      amountPaid: formatMoney(app.applicationFee),
      paymentCategory: "Application / Enrollment Fee",
      paymentReference: app.paymentReference,
      paymentVerifiedAt: formatDate(app.paymentVerifiedAt),
      enrolledOrApprovedAt: formatDate(app.mainAdminApprovedAt),
    }));

  const totalPaid = payments
    .filter(p => p.status === "verified")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const financeSummaryRows = [
    { item: "Total applications", value: applications.length },
    { item: "Payment proofs submitted", value: payments.filter(p => p.status === "submitted").length },
    { item: "Verified payments", value: payments.filter(p => p.status === "verified").length },
    { item: "Approved/enrolled applications", value: enrolledRows.length },
    { item: "Total verified amount", value: formatMoney(totalPaid) },
  ];

  const academicSections = [
    {
      title: "Report Scope",
      sub: isRestrictedAdmin
        ? "This report contains only this admin's assigned groups."
        : "This report contains all groups because this account is Main Controller.",
      rows: reportScopeRows,
      filename: "intizar-report-scope.xls",
    },
    { title: "User Summary", sub: "Total users by role", rows: userRows, filename: "intizar-user-summary.xls" },
    { title: "Group Performance", sub: "Students, attendance, grades, and submission rate per group", rows: groupRows, filename: "intizar-group-performance.xls" },
    { title: "Course Performance", sub: "Course usage, lectures, assignments, videos, materials, and average grade", rows: courseRows, filename: "intizar-course-performance.xls" },
    { title: "At-risk Students", sub: "Students who may need attention", rows: atRiskRows, filename: "intizar-at-risk-students.xls" },
  ];

  const financeSections = isMainController
    ? [
        { title: "Finance Summary", sub: "Application and enrollment payment totals", rows: financeSummaryRows, filename: "intizar-finance-summary.xls" },
        { title: "Enrollment Report", sub: "Approved applications/enrolled students with date, amount, and payment category", rows: enrolledRows, filename: "intizar-enrollment-report.xls" },
        { title: "Payment Transactions", sub: "All submitted and verified payment records", rows: paymentRows, filename: "intizar-payment-transactions.xls" },
        { title: "Application Register", sub: "All submitted application records", rows: applicationRows, filename: "intizar-application-register.xls" },
      ]
    : [
        {
          title: "Financial Reports",
          sub: "Restricted admins cannot view global payment reports.",
          rows: [{ scope: "Restricted Admin", note: "Only Main Controller can view and download application/payment finance reports." }],
          filename: "intizar-finance-scope.xls",
        },
      ];

  const sections = [...financeSections, ...academicSections];

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Admin Reports</div>
          <h1 style={heroTitle}>Reports, Finance & Performance</h1>
          <p style={heroSub}>
            Download spreadsheet reports or print/save as PDF. Includes enrollment, payment, academic, and group reports.
          </p>
        </div>

        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button style={heroButton} onClick={() => downloadWorkbook("intizar-full-report.xls", sections)}>
            Download Full Sheet
          </button>
          <button style={heroButton} onClick={() => printReport("INTIZAR Full Admin Report", sections)}>
            Print / Save PDF
          </button>
        </div>
      </div>

      <div style={statsGrid}>
        <Stat label="Students" value={String(students.length)} />
        <Stat label="Groups" value={String(groups.length)} />
        <Stat label="Applications" value={isMainController ? String(applications.length) : "-"} />
        <Stat label="Enrolled/Paid" value={isMainController ? String(enrolledRows.length) : "-"} />
        <Stat label="Verified Amount" value={isMainController ? formatMoney(totalPaid) : "-"} />
        <Stat label="At-risk Students" value={String(atRiskRows.length)} danger={atRiskRows.length > 0} />
      </div>

      {sections.map((section) => (
        <ReportSection
          key={section.title}
          title={section.title}
          sub={section.sub}
          rows={section.rows}
          filename={section.filename}
        />
      ))}
    </div>
  );
}

function ReportSection({
  title,
  sub,
  rows,
  filename,
}: {
  title: string;
  sub: string;
  rows: any[];
  filename: string;
}) {
  const headers = rows.length ? Object.keys(rows[0]) : [];

  return (
    <Card>
      <div style={sectionHead}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionSub}>{sub}</p>
        </div>
      </div>

      {rows.length === 0 && (
        <div style={emptyState}>
          <strong>No records found</strong>
          <p>There is no data for this section yet.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{overflowX:"auto",marginTop:16}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8fafc",textAlign:"left"}}>
                {headers.map((h) => (
                  <th key={h} style={th}>{formatHeader(h)}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{borderBottom:"1px solid #e2e8f0"}}>
                  {headers.map((h) => (
                    <td key={h} style={td}>{String(row[h] ?? "-")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={downloadFooter}>
        <button style={downloadButton} onClick={() => downloadWorkbook(filename, [{ title, sub, rows }])}>
          Download Sheet
        </button>

        <button style={outlineButton} onClick={() => printReport(title, [{ title, sub, rows }])}>
          Print / Save PDF
        </button>
      </div>
    </Card>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={{...statValue, color: danger ? "#dc2626" : C.text}}>{value}</div>
    </div>
  );
}

function displayPercent(value: number | null) {
  return value === null ? "-" : value + "%";
}

function formatMoney(value: number) {
  return "₦" + Number(value || 0).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatHeader(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function tableHtml(rows: any[]) {
  if (!rows.length) return "<p>No records found.</p>";

  const headers = Object.keys(rows[0]);

  return `
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${escapeHtml(formatHeader(h))}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>${headers.map(h => `<td>${escapeHtml(String(row[h] ?? "-"))}</td>`).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function downloadWorkbook(filename: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #052e16; }
          h2 { color: #166534; margin-top: 24px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
          th { background: #dcfce7; color: #052e16; font-weight: bold; }
          th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>INTIZAR Academy Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${sections.map(section => `
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.sub || "")}</p>
          ${tableHtml(section.rows)}
        `).join("")}
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function printReport(title: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const win = window.open("", "_blank");

  if (!win) {
    alert("Popup blocked. Please allow popups to print the report.");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
          h1 { color: #052e16; margin-bottom: 4px; }
          h2 { color: #166534; margin-top: 28px; border-bottom: 2px solid #dcfce7; padding-bottom: 6px; }
          p { color: #475569; }
          table { border-collapse: collapse; width: 100%; margin-top: 12px; page-break-inside: auto; }
          th { background: #dcfce7; color: #052e16; text-align: left; font-weight: bold; }
          th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 12px; }
          tr { page-break-inside: avoid; }
          .meta { margin-bottom: 20px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="padding:10px 14px;margin-bottom:20px;font-weight:bold;">
          Print / Save as PDF
        </button>

        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Generated: ${new Date().toLocaleString()}</p>

        ${sections.map(section => `
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.sub || "")}</p>
          ${tableHtml(section.rows)}
        `).join("")}
      </body>
    </html>
  `);

  win.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  display:"flex",
  justifyContent:"space-between",
  gap:22,
  marginBottom:22,
  boxShadow:"0 18px 45px rgba(5,46,22,.22)",
};

const eyebrow: CSSProperties = {
  fontSize:12,
  fontWeight:900,
  textTransform:"uppercase",
  letterSpacing:1.8,
  color:"#bbf7d0",
  marginBottom:8,
};

const heroTitle: CSSProperties = {
  margin:0,
  fontSize:34,
  lineHeight:1.15,
  fontWeight:900,
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:760,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const heroButton: CSSProperties = {
  border:"1px solid rgba(255,255,255,.22)",
  background:"rgba(255,255,255,.12)",
  color:"#fff",
  borderRadius:14,
  padding:"12px 16px",
  fontWeight:900,
  cursor:"pointer",
  whiteSpace:"nowrap",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",
  gap:16,
  marginBottom:20,
};

const statCard: CSSProperties = {
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:18,
  boxShadow:"0 6px 20px rgba(15,23,42,.04)",
};

const statLabel: CSSProperties = {
  color:C.muted,
  fontSize:13,
  fontWeight:900,
};

const statValue: CSSProperties = {
  fontSize:26,
  fontWeight:900,
  marginTop:5,
};

const sectionHead: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"flex-start",
  gap:14,
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:20,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"5px 0 0",
  color:C.muted,
  fontSize:13,
};

const th: CSSProperties = {
  padding:"13px",
  fontSize:12,
  color:C.muted,
  fontWeight:900,
  textTransform:"uppercase",
};

const td: CSSProperties = {
  padding:"14px 13px",
  fontSize:14,
  color:C.text,
};

const emptyState: CSSProperties = {
  minHeight:130,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
  background:"#f8fafc",
  border:"1px dashed #cbd5e1",
  borderRadius:16,
  padding:20,
  marginTop:16,
};

const downloadFooter: CSSProperties = {
  display:"flex",
  justifyContent:"flex-end",
  gap:10,
  marginTop:18,
  paddingTop:14,
  borderTop:"1px solid #e2e8f0",
};

const downloadButton: CSSProperties = {
  border:"none",
  background:C.primary,
  color:"#fff",
  borderRadius:12,
  padding:"10px 14px",
  fontWeight:900,
  cursor:"pointer",
};

const outlineButton: CSSProperties = {
  border:"1px solid #e2e8f0",
  background:"#fff",
  color:C.text,
  borderRadius:12,
  padding:"10px 14px",
  fontWeight:900,
  cursor:"pointer",
};


