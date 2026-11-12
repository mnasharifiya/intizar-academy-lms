const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Remove broken inline schedule blocks that were inserted outside exam scope
function removeScheduleBlocks(input) {
  const lines = input.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("<div style={scheduleBox}>")) {
      let depth = 0;

      for (; i < lines.length; i++) {
        const line = lines[i];
        const opens = (line.match(/<div\b/g) || []).length;
        const closes = (line.match(/<\/div>/g) || []).length;

        depth += opens;
        depth -= closes;

        if (depth <= 0) break;
      }

      continue;
    }

    out.push(lines[i]);
  }

  return out.join("\n");
}

text = removeScheduleBlocks(text);

// Add helper functions if missing
if (!text.includes("function formatCbtDateTime")) {
  text = text.replace(
    "export default",
`function formatCbtDateTime(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatCbtDate(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getCbtScheduleStatus(exam: any) {
  const now = new Date();
  const start = exam.start_at ? new Date(exam.start_at) : null;
  const end = exam.end_at ? new Date(exam.end_at) : null;

  if (start && now < start) return "Not started";
  if (end && now > end) return "Ended";

  return "Open now";
}

function getCbtScheduleColor(exam: any) {
  const status = getCbtScheduleStatus(exam);

  if (status === "Open now") return "#166534";
  if (status === "Not started") return "#92400e";

  return "#991b1b";
}

export default`
  );
}

// Add schedule component
if (!text.includes("function CbtScheduleBlock")) {
  text = text.replace(
    "export default",
`function CbtScheduleBlock({ exam }: any) {
  return (
    <div style={scheduleBox}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <strong>CBT Schedule</strong>
        <span style={{ color: getCbtScheduleColor(exam), fontWeight: 900 }}>
          {getCbtScheduleStatus(exam)}
        </span>
      </div>

      <div style={scheduleGrid}>
        <div style={scheduleItem}>
          <div style={scheduleLabel}>Exam Date</div>
          <div style={scheduleValue}>{formatCbtDate(exam.start_at || exam.created_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>Start Time</div>
          <div style={scheduleValue}>{formatCbtDateTime(exam.start_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>End Time</div>
          <div style={scheduleValue}>{formatCbtDateTime(exam.end_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>Duration</div>
          <div style={scheduleValue}>{exam.duration_minutes || exam.durationMinutes || 0} minutes</div>
        </div>
      </div>
    </div>
  );
}

export default`
  );
}

// Insert schedule component inside exam card
if (!text.includes("<CbtScheduleBlock exam={exam} />")) {
  const patterns = [
    /(exams\.map\(\(exam: any\) => \(\s*<Card[^>]*>)/,
    /(exams\.map\(\(exam\) => \(\s*<Card[^>]*>)/,
    /(availableExams\.map\(\(exam: any\) => \(\s*<Card[^>]*>)/,
    /(availableExams\.map\(\(exam\) => \(\s*<Card[^>]*>)/,
  ];

  let changed = false;

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      text = text.replace(pattern, `$1
              <CbtScheduleBlock exam={exam} />`);
      changed = true;
      break;
    }
  }

  if (!changed) {
    console.error("Could not find exams.map Card block. Send Select-String around exams.map.");
    process.exit(1);
  }
}

// Add styles if missing
if (!text.includes("const scheduleBox")) {
  text += `

const scheduleBox = {
  display: "grid",
  gap: 8,
  padding: 12,
  border: "1px solid #dbe3ef",
  borderRadius: 14,
  background: "#f8fafc",
  margin: "12px 0",
};

const scheduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const scheduleItem = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 10,
  background: "#ffffff",
};

const scheduleLabel = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
  marginBottom: 4,
};

const scheduleValue = {
  color: "#0f172a",
  fontWeight: 900,
};
`;
}

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT schedule fixed inside exam card.");
