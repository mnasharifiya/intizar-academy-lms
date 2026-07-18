const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add helper functions and schedule component before Badge
if (!text.includes("function formatCbtDateTime")) {
  text = text.replace(
`function Badge({ children }: any) {`,
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

function CbtScheduleBlock({ exam }: any) {
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
          <div style={scheduleValue}>{exam.duration_minutes || 0} minutes</div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: any) {`
  );
}

// Add schedule status inside exams.map before canStart
if (!text.includes("const scheduleStatus = getCbtScheduleStatus(exam);")) {
  text = text.replace(
`          const allowed = Number(exam.attempts_allowed || 1);
          const canStart = Boolean(inProgress) || submitted < allowed;`,
`          const allowed = Number(exam.attempts_allowed || 1);
          const scheduleStatus = getCbtScheduleStatus(exam);
          const scheduleOpen = scheduleStatus === "Open now";
          const canStart = scheduleOpen && (Boolean(inProgress) || submitted < allowed);`
  );
}

// Insert schedule block after description and before badges
if (!text.includes("<CbtScheduleBlock exam={exam} />")) {
  text = text.replace(
`                  {exam.description && (
                    <p>{exam.description}</p>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>`,
`                  {exam.description && (
                    <p>{exam.description}</p>
                  )}

                  <CbtScheduleBlock exam={exam} />

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>`
  );
}

// Add status badge
if (!text.includes("<Badge>{scheduleStatus}</Badge>")) {
  text = text.replace(
`                    <Badge>{examQuestions(exam.id).length} questions</Badge>`,
`                    <Badge>{scheduleStatus}</Badge>
                    <Badge>{examQuestions(exam.id).length} questions</Badge>`
  );
}

// Improve button text for not started/ended
text = text.replace(
`                    {inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}`,
`                    {!scheduleOpen ? scheduleStatus : inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}`
);

// Add schedule styles
if (!text.includes("const scheduleBox")) {
  text = text.replace(
`const examListCard = {`,
`const scheduleBox = {
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

const examListCard = {`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT schedule added correctly.");
