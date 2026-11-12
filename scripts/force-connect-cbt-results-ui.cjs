const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

if (!text.includes("onClick={downloadCbtResults}")) {
  const header = '<h2 style={{ marginTop: 0 }}>Created CBT Exams</h2>';
  const headerIndex = text.indexOf(header);

  if (headerIndex === -1) {
    console.error("Could not find Created CBT Exams heading.");
    process.exit(1);
  }

  const cardStart = text.lastIndexOf("      <Card>", headerIndex);

  if (cardStart === -1) {
    console.error("Could not find Created CBT Exams Card start.");
    process.exit(1);
  }

  const resultsSection = `      <Card>
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

`;

  text = text.slice(0, cardStart) + resultsSection + text.slice(cardStart);
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT Results UI force connected.");
