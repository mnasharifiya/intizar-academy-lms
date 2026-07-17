const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add filter states after first useState group
if (!text.includes("resultExamFilter")) {
  text = text.replace(
    /const \[error, setError\] = useState\(""\);/,
`const [error, setError] = useState("");

  const [resultExamFilter, setResultExamFilter] = useState("");
  const [resultProgramFilter, setResultProgramFilter] = useState("");
  const [resultGroupFilter, setResultGroupFilter] = useState("");
  const [resultDateFrom, setResultDateFrom] = useState("");
  const [resultDateTo, setResultDateTo] = useState("");`
  );
}

// Replace resultRows function with filtered version
const resultStart = text.indexOf("  function resultRows() {");
const downloadStart = text.indexOf("  function downloadCbtResults()", resultStart);

if (resultStart === -1 || downloadStart === -1) {
  console.error("Could not find resultRows/downloadCbtResults functions.");
  process.exit(1);
}

const newResultRows = `  function programName(id: string) {
    const levels = data?.levels ?? data?.programs ?? [];
    const program = levels.find((item: any) => item.id === id);

    return program?.name || program?.title || "-";
  }

  function groupProgramId(groupId: string) {
    const group = groups.find((item: any) => item.id === groupId);

    return group?.level_id || group?.levelId || group?.program_id || group?.programId || "";
  }

  function resultRows() {
    const rows = attempts
      .filter((attempt: any) => attempt.status === "submitted")
      .map((attempt: any) => {
        const exam = exams.find((item: any) => item.id === attempt.exam_id);
        const programId = exam ? groupProgramId(exam.group_id) : "";

        return {
          attempt,
          exam,
          student: studentName(attempt.student_id),
          examTitle: exam?.title || "Unknown exam",
          course: exam ? courseName(exam.course_id) : "-",
          group: exam ? groupName(exam.group_id) : "-",
          groupId: exam?.group_id || "",
          programId,
          program: programId ? programName(programId) : "-",
          score: Number(attempt.score || 0),
          total: Number(attempt.total_points || 0),
          percentage: Number(attempt.percentage || 0),
          submittedAt: attempt.submitted_at || attempt.created_at,
        };
      });

    return rows
      .filter((row: any) => !resultExamFilter || row.exam?.id === resultExamFilter)
      .filter((row: any) => !resultProgramFilter || row.programId === resultProgramFilter)
      .filter((row: any) => !resultGroupFilter || row.groupId === resultGroupFilter)
      .filter((row: any) => {
        if (!resultDateFrom) return true;
        if (!row.submittedAt) return false;

        return new Date(row.submittedAt) >= new Date(resultDateFrom + "T00:00:00");
      })
      .filter((row: any) => {
        if (!resultDateTo) return true;
        if (!row.submittedAt) return false;

        return new Date(row.submittedAt) <= new Date(resultDateTo + "T23:59:59");
      })
      .sort((a: any, b: any) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  }

  function ResultFilters() {
    const levels = data?.levels ?? data?.programs ?? [];

    return (
      <div style={filterBox}>
        <strong>Filter CBT Results</strong>

        <div style={filterGrid}>
          <select style={filterInput} value={resultExamFilter} onChange={(e: any) => setResultExamFilter(e.target.value)}>
            <option value="">All exams</option>
            {exams.map((exam: any) => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>

          <select style={filterInput} value={resultProgramFilter} onChange={(e: any) => setResultProgramFilter(e.target.value)}>
            <option value="">All programs</option>
            {levels.map((program: any) => (
              <option key={program.id} value={program.id}>{program.name || program.title}</option>
            ))}
          </select>

          <select style={filterInput} value={resultGroupFilter} onChange={(e: any) => setResultGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((group: any) => (
              <option key={group.id} value={group.id}>{group.name || group.title}</option>
            ))}
          </select>

          <input style={filterInput} type="date" value={resultDateFrom} onChange={(e: any) => setResultDateFrom(e.target.value)} />
          <input style={filterInput} type="date" value={resultDateTo} onChange={(e: any) => setResultDateTo(e.target.value)} />

          <button
            type="button"
            style={lightBtn}
            onClick={() => {
              setResultExamFilter("");
              setResultProgramFilter("");
              setResultGroupFilter("");
              setResultDateFrom("");
              setResultDateTo("");
            }}
          >
            Clear Filters
          </button>
        </div>

        <p style={{ color: C.muted, marginBottom: 0 }}>
          Showing {resultRows().length} submitted CBT result(s).
        </p>
      </div>
    );
  }

`;

text = text.slice(0, resultStart) + newResultRows + text.slice(downloadStart);

// Add Program column to download if missing
text = text.replace(
  "<th>S/N</th><th>Student</th><th>Exam</th><th>Course</th><th>Group</th><th>Score</th><th>Total</th><th>Percentage</th><th>Submitted At</th>",
  "<th>S/N</th><th>Student</th><th>Exam</th><th>Program</th><th>Course</th><th>Group</th><th>Score</th><th>Total</th><th>Percentage</th><th>Submitted At</th>"
);

text = text.replace(
  '"<td>" + escapeCell(row.examTitle) + "</td>" +\n        "<td>" + escapeCell(row.course) + "</td>" +',
  '"<td>" + escapeCell(row.examTitle) + "</td>" +\n        "<td>" + escapeCell(row.program) + "</td>" +\n        "<td>" + escapeCell(row.course) + "</td>" +'
);

// Add ResultFilters above every download button
text = text.replaceAll(
  `<div style={{ marginBottom: 12 }}>
            <button type="button" onClick={downloadCbtResults} style={greenBtn}>`,
  `<ResultFilters />

          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={downloadCbtResults} style={greenBtn}>`
);

text = text.replaceAll(
  `<div style={{ marginBottom: 12 }}>
          <button type="button" onClick={downloadCbtResults} style={greenBtn}>`,
  `<ResultFilters />

          <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={downloadCbtResults} style={greenBtn}>`
);

// Add Program column to visible result tables
text = text.replaceAll(
  `<th style={th}>Course</th>
                    <th style={th}>Group</th>`,
  `<th style={th}>Program</th>
                    <th style={th}>Course</th>
                    <th style={th}>Group</th>`
);

text = text.replaceAll(
  `<td style={td}>{row.course}</td>
                      <td style={td}>{row.group}</td>`,
  `<td style={td}>{row.program}</td>
                      <td style={td}>{row.course}</td>
                      <td style={td}>{row.group}</td>`
);

// Add filter styles
if (!text.includes("const filterBox")) {
  text = text.replace(
`const resultTable = {`,
`const filterBox = {
  border: "1px solid #dbe3ef",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
  marginBottom: 14,
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const filterInput = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

const resultTable = {`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT result filters added.");
