const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Add missing filter states inside the component
if (!text.includes("const [resultExamFilter, setResultExamFilter]")) {
  const componentRegex = /(export default function InstructorCbtExamsPage\([^{]*\)\s*\{)/;

  if (!componentRegex.test(text)) {
    console.error("Could not find InstructorCbtExamsPage component opening.");
    process.exit(1);
  }

  text = text.replace(
    componentRegex,
    `$1
  const [resultExamFilter, setResultExamFilter] = useState("");
  const [resultProgramFilter, setResultProgramFilter] = useState("");
  const [resultGroupFilter, setResultGroupFilter] = useState("");
  const [resultDateFrom, setResultDateFrom] = useState("");
  const [resultDateTo, setResultDateTo] = useState("");
`
  );
}

// Add missing light button style
if (!text.includes("const lightBtn")) {
  const marker = "const filterBox = {";

  if (text.includes(marker)) {
    text = text.replace(
      marker,
`const lightBtn = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: C.dark,
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

${marker}`
    );
  } else {
    text += `

const lightBtn = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: C.dark,
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
};
`;
  }
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT filter states and light button fixed.");
