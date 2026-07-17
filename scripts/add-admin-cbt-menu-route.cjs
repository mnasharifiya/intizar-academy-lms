const fs = require("fs");

// Add admin menu item if missing
let layout = fs.readFileSync("src/components/layout/AppLayout.tsx", "utf8");

layout = layout.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];/,
  (match, names) => {
    if (names.includes("ClipboardList")) return match;
    return `import {${names}, ClipboardList } from "lucide-react";`;
  }
);

if (!layout.includes('id: "admin-cbt-exams"')) {
  layout = layout.replace(
    /(\{ id: "reports"[\s\S]*?\},)/,
    `$1
  { id: "admin-cbt-exams", label: "CBT Results", icon: ClipboardList },`
  );
}

fs.writeFileSync("src/components/layout/AppLayout.tsx", layout, "utf8");

// Add route in App.tsx
let app = fs.readFileSync("src/App.tsx", "utf8");

if (!app.includes('page === "admin-cbt-exams"')) {
  app = app.replace(
    /(if \(page === "reports"[\s\S]*?;\r?\n)/,
    `$1    if (page === "admin-cbt-exams") return <InstructorCbtExamsPage data={scopedData} />;\n`
  );
}

fs.writeFileSync("src/App.tsx", app, "utf8");

console.log("Admin CBT menu and route added.");
