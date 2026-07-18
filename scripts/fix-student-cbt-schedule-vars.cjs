const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Add scheduleStatus and scheduleOpen after allowed
if (!text.includes("const scheduleStatus = getCbtScheduleStatus(exam);")) {
  text = text.replace(
    /(\s*const allowed = Number\(exam\.attempts_allowed \|\| 1\);\r?\n)/,
    `$1          const scheduleStatus = getCbtScheduleStatus(exam);
          const scheduleOpen = scheduleStatus === "Open now";
`
  );
}

// 2. Make canStart depend on scheduleOpen
text = text.replace(
  /const canStart = Boolean\(inProgress\) \|\| submitted < allowed;/,
  `const canStart = scheduleOpen && (Boolean(inProgress) || submitted < allowed);`
);

// 3. Insert schedule block inside each exam card before badges
if (!text.includes("<CbtScheduleBlock exam={exam} />")) {
  const badgeDiv = `                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>`;

  const index = text.indexOf(badgeDiv);

  if (index === -1) {
    console.error("Could not find badge div.");
    process.exit(1);
  }

  text = text.slice(0, index) + `                  <CbtScheduleBlock exam={exam} />

` + text.slice(index);
}

// 4. If status badge exists but variables still missing, this will now be fixed.
// If schedule badge does not exist, add it.
if (!text.includes("<Badge>{scheduleStatus}</Badge>")) {
  text = text.replace(
    `<Badge>{examQuestions(exam.id).length} questions</Badge>`,
    `<Badge>{scheduleStatus}</Badge>
                    <Badge>{examQuestions(exam.id).length} questions</Badge>`
  );
}

// 5. Make button text schedule-aware
text = text.replace(
  `{inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}`,
  `{!scheduleOpen ? scheduleStatus : inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}`
);

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT schedule variables and block fixed.");
