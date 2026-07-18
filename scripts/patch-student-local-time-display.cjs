const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add local timezone label helper
if (!text.includes("function getLocalTimeZoneLabel")) {
  text = text.replace(
`function formatCbtDateTime(value?: string | null) {`,
`function getLocalTimeZoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Your local time";
  } catch {
    return "Your local time";
  }
}

function formatCbtWatDateTime(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return String(value);
  }
}

function formatCbtDateTime(value?: string | null) {`
  );
}

// Student main display should use local/device timezone, not forced WAT
text = text.replace(
`return new Date(value).toLocaleString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });`,
`return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });`
);

text = text.replace(
`return new Date(value).toLocaleDateString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
    });`,
`return new Date(value).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });`
);

// Change student labels to clearly say local time
text = text.replaceAll(
  `<div style={scheduleLabel}>Exam Date</div>`,
  `<div style={scheduleLabel}>Exam Date (Your Time)</div>`
);

text = text.replaceAll(
  `<div style={scheduleLabel}>Start Time</div>`,
  `<div style={scheduleLabel}>Start Time (Your Time)</div>`
);

text = text.replaceAll(
  `<div style={scheduleLabel}>End Time</div>`,
  `<div style={scheduleLabel}>End Time (Your Time)</div>`
);

// Add student's detected timezone line
if (!text.includes("Timezone: {getLocalTimeZoneLabel()}")) {
  text = text.replace(
`        <span style={{ color: getCbtScheduleColor(exam), fontWeight: 900 }}>
          {getCbtScheduleStatus(exam)}
        </span>
      </div>`,
`        <span style={{ color: getCbtScheduleColor(exam), fontWeight: 900 }}>
          {getCbtScheduleStatus(exam)}
        </span>
      </div>

      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
        Timezone: {getLocalTimeZoneLabel()}
      </div>`
  );
}

// Add original Nigeria/WAT reference block
if (!text.includes("Original Nigeria/WAT Time")) {
  text = text.replace(
`        <div style={scheduleItem}>
          <div style={scheduleLabel}>Duration</div>
          <div style={scheduleValue}>{exam.duration_minutes || 0} minutes</div>
        </div>`,
`        <div style={scheduleItem}>
          <div style={scheduleLabel}>Duration</div>
          <div style={scheduleValue}>{exam.duration_minutes || 0} minutes</div>
        </div>

        <div style={{ ...scheduleItem, gridColumn: "1 / -1" }}>
          <div style={scheduleLabel}>Original Nigeria/WAT Time</div>
          <div style={scheduleValue}>
            {formatCbtWatDateTime(exam.start_at)} → {formatCbtWatDateTime(exam.end_at)}
          </div>
        </div>`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT now shows local timezone plus original Nigeria/WAT time.");
