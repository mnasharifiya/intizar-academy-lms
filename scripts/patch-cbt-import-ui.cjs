const fs = require("fs");

const path = "src/pages/instructor/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

if (!text.includes("parseCbtQuestionsFromText")) {
  text = text.replace(
    'import { deleteCbtExam, loadCbtExams, saveCbtExam, updateCbtExamStatus, type CbtQuestionInput } from "../../lib/cbtApi";',
    'import { deleteCbtExam, loadCbtExams, saveCbtExam, updateCbtExamStatus, type CbtQuestionInput } from "../../lib/cbtApi";\nimport { extractTextFromExamFile, parseCbtQuestionsFromText } from "../../lib/cbtImport";'
  );
}

if (!text.includes("const [bulkText")) {
  text = text.replace(
    '  const [examQuestions, setExamQuestions] = useState<CbtQuestionInput[]>([emptyQuestion()]);',
    '  const [examQuestions, setExamQuestions] = useState<CbtQuestionInput[]>([emptyQuestion()]);\n  const [bulkText, setBulkText] = useState("");\n  const [importingFile, setImportingFile] = useState(false);'
  );
}

if (!text.includes("function addImportedQuestions")) {
  text = text.replace(
    '  function addQuestion() {',
    `  function isEmptyStarterQuestion(question: CbtQuestionInput) {
    return (
      !question.questionText.trim() &&
      question.options.every(option => !option.optionText.trim() || option.optionText === "True" || option.optionText === "False")
    );
  }

  function addImportedQuestions(imported: CbtQuestionInput[]) {
    if (!imported.length) {
      alert("No questions found. Please check the format.");
      return;
    }

    setExamQuestions(prev => {
      if (prev.length === 1 && isEmptyStarterQuestion(prev[0])) {
        return imported;
      }

      return [...prev, ...imported];
    });

    alert(imported.length + " questions imported. Please review before saving.");
  }

  function importFromText() {
    try {
      const imported = parseCbtQuestionsFromText(bulkText);
      addImportedQuestions(imported);
    } catch (err: any) {
      alert(err?.message || "Could not import questions.");
    }
  }

  async function importFromFile(file?: File | null) {
    if (!file) return;

    setImportingFile(true);

    try {
      const extracted = await extractTextFromExamFile(file);
      setBulkText(extracted);

      const imported = parseCbtQuestionsFromText(extracted);
      addImportedQuestions(imported);
    } catch (err: any) {
      alert(err?.message || "Could not read this exam file.");
    } finally {
      setImportingFile(false);
    }
  }

  function addQuestion() {`
  );
}

if (!text.includes("Bulk Import Questions")) {
  text = text.replace(
    '          <h3>Questions</h3>',
    `          <div style={importBox}>
            <h3 style={{ marginTop: 0 }}>Bulk Import Questions</h3>
            <p style={{ color: C.muted, marginTop: 0 }}>
              Upload PDF, DOCX, TXT, or CSV, or paste questions below. Format: question, options A-D, then Answer: A.
            </p>

            <input
              type="file"
              accept=".pdf,.docx,.txt,.csv"
              disabled={importingFile}
              onChange={e => importFromFile(e.target.files?.[0])}
              style={{ marginBottom: 12 }}
            />

            <textarea
              style={importTextArea}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"1. What is Akhlaq?\\nA. Good character\\nB. Food\\nC. Computer\\nD. Money\\nAnswer: A"}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={importFromText} style={greenBtn}>
                Import Questions from Text
              </button>

              <button type="button" onClick={() => setBulkText("")} style={secondaryBtn}>
                Clear Import Text
              </button>
            </div>

            <p style={{ color: C.muted, fontSize: 13 }}>
              Note: scanned image PDFs may not import correctly unless the text is selectable.
            </p>
          </div>

          <h3>Questions</h3>`
  );
}

if (!text.includes("const importBox")) {
  text = text.replace(
    'const questionBox = {',
    `const importBox = {
  border: "1px solid #bbf7d0",
  borderRadius: 16,
  padding: 14,
  background: "#f0fdf4",
  marginTop: 16,
  marginBottom: 16,
};

const importTextArea = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 12,
  padding: "11px 12px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  minHeight: 160,
  fontFamily: "Consolas, monospace",
};

const questionBox = {`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT bulk import UI patched.");
