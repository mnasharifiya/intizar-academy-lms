const fs = require("fs");

// Fix App.tsx: remove undefined user prop
let app = fs.readFileSync("src/App.tsx", "utf8");
app = app.replaceAll(
  '<InstructorCbtExamsPage data={scopedData} user={user} />',
  '<InstructorCbtExamsPage data={scopedData} />'
);
fs.writeFileSync("src/App.tsx", app, "utf8");

// Fix AppLayout.tsx: CBT menu needs icon
let layout = fs.readFileSync("src/components/layout/AppLayout.tsx", "utf8");

layout = layout.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];/,
  (match, names) => {
    if (names.includes("ClipboardList")) return match;
    return `import {${names}, ClipboardList } from "lucide-react";`;
  }
);

layout = layout.replaceAll(
  '{ id: "cbt-exams", label: "CBT Exams" }',
  '{ id: "cbt-exams", label: "CBT Exams", icon: ClipboardList }'
);

fs.writeFileSync("src/components/layout/AppLayout.tsx", layout, "utf8");

// Fix cbtApi.ts typing
let api = fs.readFileSync("src/lib/cbtApi.ts", "utf8");

api = api.replaceAll("exam.id", "(exam as any).id");
api = api.replaceAll("savedQuestion.id", "(savedQuestion as any).id");

fs.writeFileSync("src/lib/cbtApi.ts", api, "utf8");

// Fix Instructor CBT page unused variables
let page = fs.readFileSync("src/pages/instructor/CbtExams.tsx", "utf8");

page = page.replace(
  "export default function InstructorCbtExamsPage({ data, user }: any) {",
  "export default function InstructorCbtExamsPage({ data }: any) {"
);

page = page.replace(
  "  const [options, setOptions] = useState<any[]>([]);\n",
  ""
);

page = page.replace(
  "      setOptions(result.options);\n",
  ""
);

fs.writeFileSync("src/pages/instructor/CbtExams.tsx", page, "utf8");

console.log("CBT Phase 2 build errors fixed.");
