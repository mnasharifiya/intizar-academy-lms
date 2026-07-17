const fs = require("fs");

const apiPath = "src/lib/cbtApi.ts";
let api = fs.readFileSync(apiPath, "utf8");

// Add gradeComponentType to save input type
if (!api.includes("gradeComponentType?: string;")) {
  api = api.replace(
    "showResultImmediately: boolean;",
    `showResultImmediately: boolean;
  gradeComponentType?: string;`
  );
}

// Add grade_component_type to Supabase payload
if (!api.includes("grade_component_type: input.gradeComponentType")) {
  api = api.replace(
    "show_result_immediately: input.showResultImmediately,",
    `show_result_immediately: input.showResultImmediately,
      grade_component_type: input.gradeComponentType || "quiz",`
  );
}

fs.writeFileSync(apiPath, api, "utf8");

// Make sure page sends gradeComponentType to API
const pagePath = "src/pages/instructor/CbtExams.tsx";
let page = fs.readFileSync(pagePath, "utf8");

if (!page.includes("gradeComponentType: form.gradeComponentType")) {
  page = page.replace(
    "showResultImmediately: form.showResultImmediately,",
    `showResultImmediately: form.showResultImmediately,
      gradeComponentType: form.gradeComponentType || "quiz",`
  );
}

fs.writeFileSync(pagePath, page, "utf8");

console.log("CBT API grade component fixed.");
