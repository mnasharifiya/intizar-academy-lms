const fs = require("fs");

const pagePath = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Allow adminResultsOnly prop
if (!text.includes("adminResultsOnly = false")) {
  text = text.replace(
    /export default function InstructorCbtExamsPage\(\{\s*data\s*\}: any\)\s*\{/,
    "export default function InstructorCbtExamsPage({ data, adminResultsOnly = false }: any) {"
  );

  text = text.replace(
    /function InstructorCbtExamsPage\(\{\s*data\s*\}: any\)\s*\{/,
    "function InstructorCbtExamsPage({ data, adminResultsOnly = false }: any) {"
  );
}

// Insert admin-only results page before normal instructor return
if (!text.includes("adminResultsOnly")) {
  console.error("Could not update component props.");
  process.exit(1);
}

if (!text.includes("Admin CBT Results Only View")) {
  const componentStart = text.indexOf("InstructorCbtExamsPage");
  const returnIndex = text.indexOf("\n  return (", componentStart);

  if (returnIndex === -1) {
    console.error("Could not find main return.");
    process.exit(1);
  }

  const adminOnlyBlock = `
  // Admin CBT Results Only View
  if (adminResultsOnly) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Card>
          <h1 style={{ marginTop: 0 }}>CBT Results</h1>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Admin can view and download submitted CBT results only. Exam creation is restricted to instructors.
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
      </div>
    );
  }

`;

  text = text.slice(0, returnIndex) + adminOnlyBlock + text.slice(returnIndex);
}

fs.writeFileSync(pagePath, text, "utf8");

// Update admin route to open results-only mode
const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

app = app.replace(
  /if \(page === "admin-cbt-exams"\) return <InstructorCbtExamsPage data=\{scopedData\}\s*\/>;/,
  'if (page === "admin-cbt-exams") return <InstructorCbtExamsPage data={scopedData} adminResultsOnly={true} />;'
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Admin CBT page changed to results-only.");
