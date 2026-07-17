const fs = require("fs");

// ==========================
// Patch cbtApi.ts
// ==========================
const apiPath = "src/lib/cbtApi.ts";
let api = fs.readFileSync(apiPath, "utf8");

// Make save payload accept gradeComponentType
if (!api.includes("gradeComponentType")) {
  api = api.replace(
    "showResultImmediately?: boolean;",
    `showResultImmediately?: boolean;
  gradeComponentType?: string;`
  );

  api = api.replace(
    "show_result_immediately: input.showResultImmediately ?? true,",
    `show_result_immediately: input.showResultImmediately ?? true,
      grade_component_type: input.gradeComponentType || "exam",`
  );
}

fs.writeFileSync(apiPath, api, "utf8");

// ==========================
// Patch Instructor CBT page
// ==========================
const pagePath = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Add default form field
if (!text.includes("gradeComponentType")) {
  text = text.replace(
    "showResultImmediately: true,",
    `showResultImmediately: true,
  gradeComponentType: "quiz",`
  );
}

// Add dropdown near duration/attempts/status area
if (!text.includes("CBT Type / Grade Component")) {
  const fieldMarker = `<Field label="Duration Minutes">`;

  if (!text.includes(fieldMarker)) {
    console.error("Could not find Duration Minutes field.");
    process.exit(1);
  }

  text = text.replace(
    fieldMarker,
`<Field label="CBT Type / Grade Component">
              <select
                style={inputStyle}
                value={form.gradeComponentType || "quiz"}
                onChange={(e: any) => setForm({ ...form, gradeComponentType: e.target.value })}
              >
                <option value="quiz">Quiz CBT</option>
                <option value="exam">Exam CBT</option>
              </select>
            </Field>

            ${fieldMarker}`
  );
}

// Ensure save sends gradeComponentType
if (!text.includes("gradeComponentType: form.gradeComponentType")) {
  text = text.replace(
    "showResultImmediately: form.showResultImmediately,",
    `showResultImmediately: form.showResultImmediately,
      gradeComponentType: form.gradeComponentType || "quiz",`
  );
}

// Add visible badge in exam list if possible
if (!text.includes("Grade Component:")) {
  text = text.replace(
    `{exam.status}`,
    `{exam.status} · Grade Component: {exam.grade_component_type || "quiz"}`
  );
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("CBT quiz/exam grade component added.");
