const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Fix reset form missing gradeComponentType
text = text.replace(
`        showResultImmediately: true,
      });`,
`        showResultImmediately: true,
        gradeComponentType: "quiz",
      });`
);

// Add missing inputStyle constant
if (!text.includes("const inputStyle =")) {
  const marker = "const filterInput = {";

  if (text.includes(marker)) {
    text = text.replace(
      marker,
`const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

${marker}`
    );
  } else if (text.includes("const resultTable = {")) {
    text = text.replace(
      "const resultTable = {",
`const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

const resultTable = {`
    );
  } else {
    text += `

const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};
`;
  }
}

fs.writeFileSync(path, text, "utf8");

console.log("Fixed CBT reset form and inputStyle.");
