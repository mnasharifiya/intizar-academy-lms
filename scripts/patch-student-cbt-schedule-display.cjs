const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add schedule helper functions inside/near component helpers
if (!text.includes("function formatCbtDateTime")) {
  const marker = "function";
  const insertBefore = text.indexOf("export default");

  const helpers = `
function formatCbtDateTime(value?: string | null) {
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

`;

  if (insertBefore !== -1) {
    text = text.slice(0, insertBefore) + helpers + text.slice(insertBefore);
  } else {
    text = helpers + text;
  }
}

// Add schedule card style
if (!text.includes("const scheduleBox")) {
  const styleMarker = "const";
  const lastConstIndex = text.lastIndexOf("const ");

  const scheduleStyles = `
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

  if (lastConstIndex !== -1) {
    text = text + scheduleStyles;
  } else {
    text = text + scheduleStyles;
  }
}

// Insert schedule block before Start/Continue button area.
// We search for first button text area and add schedule before it.
if (!text.includes("Exam Date")) {
  const possibleMarkers = [
    `<button`,
    `{attemptForExam(exam.id)`,
    `Start CBT`,
    `Start Exam`,
    `Continue CBT`,
    `Continue Exam`,
  ];

  let markerIndex = -1;
  let marker = "";

  for (const item of possibleMarkers) {
    markerIndex = text.indexOf(item);
    if (markerIndex !== -1) {
      marker = item;
      break;
    }
  }

  if (markerIndex === -1) {
    console.error("Could not find where to insert student CBT schedule block.");
    process.exit(1);
  }

  const insertAt = text.lastIndexOf("<div", markerIndex);
  const safeInsertAt = insertAt !== -1 ? insertAt : markerIndex;

  const scheduleBlock = `
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

`;

  text = text.slice(0, safeInsertAt) + scheduleBlock + text.slice(safeInsertAt);
}

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT schedule display added.");
