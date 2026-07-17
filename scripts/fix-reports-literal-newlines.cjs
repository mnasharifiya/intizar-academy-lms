const fs = require("fs");

const path = "src/pages/admin/Reports.tsx";
let text = fs.readFileSync(path, "utf8");

const start = text.indexOf("function tableHtml");
const end = text.indexOf("const hero:", start);

if (start === -1 || end === -1) {
  console.error("Could not find broken Reports helper section.");
  process.exit(1);
}

const before = text.slice(0, start);
let middle = text.slice(start, end);
const after = text.slice(end);

// Convert literal backslash-n text into real new lines
middle = middle.replace(/\\n/g, "\n");

fs.writeFileSync(path, before + middle + after, "utf8");

console.log("Fixed literal newline characters in Reports.tsx");
