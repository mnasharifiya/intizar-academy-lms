const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add studentName helper after groupName helper
if (!text.includes("function studentName")) {
  text = text.replace(
`  function groupName(id: string) {
    const group = groups.find((g: any) => g.id === id);
    return group?.name || group?.title || "Unknown group";
  }`,
`  function groupName(id: string) {
    const group = groups.find((g: any) => g.id === id);
    return group?.name || group?.title || "Unknown group";
  }

  function studentName(id: string) {
    const users = data?.users ?? [];
    const student = users.find((u: any) => u.id === id);

    return (
      student?.fullName ||
      student?.full_name ||
      student?.name ||
      student?.display_name ||
      student?.email ||
      id
    );
  }

  function formatDate(value?: string) {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  function resultRows() {
    return attempts
      .filter((attempt: any) => attempt.status === "submitted")
      .map((attempt: any) => {
        const exam = exams.find((item: any) => item.id === attempt.exam_id);

        return {
          attempt,
          exam,
          student: studentName(attempt.student_id),
          examTitle: exam?.title || "Unknown exam",
          course: exam ? courseName(exam.course_id) : "-",
          group: exam ? groupName(exam.group_id) : "-",
          score: Number(attempt.score || 0),
          total: Number(attempt.total_points || 0),
          percentage: Number(attempt.percentage || 0),
          submittedAt: attempt.submitted_at || attempt.created_at,
        };
      })
      .sort((a: any, b: any) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  }

  function downloadCbtResults() {
    const rows = resultRows();

    const html = "<html><head><meta charset='UTF-8' />" +
      "<style>" +
      "body{font-family:Arial,sans-serif;color:#0f172a;}" +
      ".header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #166534;padding-bottom:14px;margin-bottom:20px;}" +
      ".logo{width:72px;height:72px;object-fit:contain;}" +
      ".org{font-size:24px;font-weight:bold;color:#052e16;}" +
      ".title{font-size:18px;font-weight:bold;color:#166534;margin-top:4px;}" +
      ".generated{font-size:12px;color:#475569;margin-top:4px;}" +
      "table{border-collapse:collapse;width:100%;margin-top:16px;}" +
      "th{background:#dcfce7;color:#052e16;font-weight:bold;}" +
      "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
      "</style></head><body>" +
      "<div class='header'>" +
      "<img src='/intizar-logo.jpg' class='logo' />" +
      "<div><div class='org'>INTIZAR Academy</div>" +
      "<div class='title'>CBT Results Report</div>" +
      "<div class='generated'>Generated: " + new Date().toLocaleString() + "</div></div>" +
      "</div>" +
      "<table><thead><tr>" +
      "<th>S/N</th><th>Student</th><th>Exam</th><th>Course</th><th>Group</th><th>Score</th><th>Total</th><th>Percentage</th><th>Submitted At</th>" +
      "</tr></thead><tbody>" +
      rows.map((row: any, index: number) =>
        "<tr>" +
        "<td>" + (index + 1) + "</td>" +
        "<td>" + escapeCell(row.student) + "</td>" +
        "<td>" + escapeCell(row.examTitle) + "</td>" +
        "<td>" + escapeCell(row.course) + "</td>" +
        "<td>" + escapeCell(row.group) + "</td>" +
        "<td>" + row.score + "</td>" +
        "<td>" + row.total + "</td>" +
        "<td>" + row.percentage + "%</td>" +
        "<td>" + escapeCell(formatDate(row.submittedAt)) + "</td>" +
        "</tr>"
      ).join("") +
      "</tbody></table></body></html>";

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "cbt-results.xls";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }`
  );
}

// Add escapeCell helper before Field function
if (!text.includes("function escapeCell")) {
  text = text.replace(
`function Field({ label, children }: any) {`,
`function escapeCell(value: any) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function Field({ label, children }: any) {`
  );
}

// Add CBT Results section after Created CBT Exams Card
if (!text.includes("CBT Results")) {
  text = text.replace(
`      <Card>
        <h2 style={{ marginTop: 0 }}>Created CBT Exams</h2>`,
`      <Card>
        <h2 style={{ marginTop: 0 }}>CBT Results</h2>
        <p style={{ color: C.muted, marginTop: 0 }}>
          View submitted CBT attempts and download official result sheet.
        </p>

        <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={downloadCbtResults} style={greenBtn}>
            Download CBT Results
          </button>
        </div>

        {resultRows().length === 0 && (
          <p style={{ color: C.muted }}>No submitted CBT results yet.</p>
        )}

        {resultRows().length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={resultTable}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={th}>Exam</th>
                  <th style={th}>Course</th>
                  <th style={th}>Group</th>
                  <th style={th}>Score</th>
                  <th style={th}>Percentage</th>
                  <th style={th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {resultRows().map((row: any) => (
                  <tr key={row.attempt.id}>
                    <td style={td}>{row.student}</td>
                    <td style={td}>{row.examTitle}</td>
                    <td style={td}>{row.course}</td>
                    <td style={td}>{row.group}</td>
                    <td style={td}>{row.score} / {row.total}</td>
                    <td style={td}><strong>{row.percentage}%</strong></td>
                    <td style={td}>{formatDate(row.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Created CBT Exams</h2>`
  );
}

// Add table styles before checkLabel
if (!text.includes("const resultTable")) {
  text = text.replace(
`const checkLabel = {`,
`const resultTable = {
  borderCollapse: "collapse" as const,
  width: "100%",
  minWidth: 850,
};

const th = {
  border: "1px solid #dbe3ef",
  padding: 10,
  background: "#dcfce7",
  color: C.dark,
  textAlign: "left" as const,
};

const td = {
  border: "1px solid #dbe3ef",
  padding: 10,
  color: C.dark,
};

const checkLabel = {`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT results section added.");
