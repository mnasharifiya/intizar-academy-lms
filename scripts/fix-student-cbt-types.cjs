const fs = require("fs");

// Fix cbtApi.ts selectedOption typing
let api = fs.readFileSync("src/lib/cbtApi.ts", "utf8");

api = api.replace(
  "const isCorrect = Boolean(selectedOption?.is_correct);",
  "const isCorrect = Boolean((selectedOption as any)?.is_correct);"
);

fs.writeFileSync("src/lib/cbtApi.ts", api, "utf8");

// Fix student CBT page result typing
let page = fs.readFileSync("src/pages/student/CbtExams.tsx", "utf8");

page = page.replaceAll("result.id", "(result as any).id");

fs.writeFileSync("src/pages/student/CbtExams.tsx", page, "utf8");

console.log("Student CBT typing errors fixed.");
