const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Insert missing filter states directly before programName/resultRows.
// This guarantees they are inside the component where resultRows is defined.
if (!text.includes("const [resultExamFilter, setResultExamFilter]")) {
  const marker = "  function programName";
  const fallbackMarker = "  function resultRows";

  if (text.includes(marker)) {
    text = text.replace(
      marker,
`  const [resultExamFilter, setResultExamFilter] = useState("");
  const [resultProgramFilter, setResultProgramFilter] = useState("");
  const [resultGroupFilter, setResultGroupFilter] = useState("");
  const [resultDateFrom, setResultDateFrom] = useState("");
  const [resultDateTo, setResultDateTo] = useState("");

${marker}`
    );
  } else if (text.includes(fallbackMarker)) {
    text = text.replace(
      fallbackMarker,
`  const [resultExamFilter, setResultExamFilter] = useState("");
  const [resultProgramFilter, setResultProgramFilter] = useState("");
  const [resultGroupFilter, setResultGroupFilter] = useState("");
  const [resultDateFrom, setResultDateFrom] = useState("");
  const [resultDateTo, setResultDateTo] = useState("");

${fallbackMarker}`
    );
  } else {
    console.error("Could not find programName or resultRows marker.");
    process.exit(1);
  }
}

// Add missing lightBtn style.
if (!text.includes("const lightBtn")) {
  if (text.includes("const filterBox = {")) {
    text = text.replace(
      "const filterBox = {",
`const lightBtn = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: C.dark,
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const filterBox = {`
    );
  } else if (text.includes("const resultTable = {")) {
    text = text.replace(
      "const resultTable = {",
`const lightBtn = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: C.dark,
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const resultTable = {`
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

console.log("CBT filter states fixed strongly.");
