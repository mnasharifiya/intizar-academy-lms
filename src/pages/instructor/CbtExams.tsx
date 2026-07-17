import { useEffect, useMemo, useState } from "react";
import { Button, Card, PageHeader } from "../../components/common/ui";
import { deleteCbtExam, loadCbtExams, saveCbtExam, updateCbtExamStatus, type CbtQuestionInput } from "../../lib/cbtApi";
import { extractTextFromExamFile, parseCbtQuestionsFromText } from "../../lib/cbtImport";

const C = {
  green: "#16a34a",
  dark: "#052e16",
  muted: "#64748b",
  border: "#e5e7eb",
  soft: "#f8fafc",
  danger: "#dc2626",
};

const emptyQuestion = (): CbtQuestionInput => ({
  questionText: "",
  questionType: "mcq",
  points: 1,
  options: [
    { optionText: "", isCorrect: true },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ],
});

export default function InstructorCbtExamsPage({ data, adminResultsOnly = false }: any) {
  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    groupId: "",
    courseId: "",
    durationMinutes: 30,
    attemptsAllowed: 1,
    startAt: "",
    endAt: "",
    status: "draft" as "draft" | "published" | "closed",
    shuffleQuestions: false,
    showResultImmediately: true,
  gradeComponentType: "quiz",
  });

  const [examQuestions, setExamQuestions] = useState<CbtQuestionInput[]>([emptyQuestion()]);
  const [bulkText, setBulkText] = useState("");
  const [importingFile, setImportingFile] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const result = await loadCbtExams();
      setExams(result.exams);
      setQuestions(result.questions);
      setAttempts(result.attempts);
    } catch (err: any) {
      alert(err?.message || "Could not load CBT exams.");
    } finally {
      setLoading(false);
    }
  }

  function courseName(id: string) {
    const course = courses.find((c: any) => c.id === id);
    return course?.name || course?.title || course?.course_name || "Unknown course";
  }

  function groupName(id: string) {
    const group = groups.find((g: any) => g.id === id);
    return group?.name || group?.title || "Unknown group";
  }

  function studentName(id: string) {
    const users = data?.users ?? [];
    const student = users.find((u: any) => u.id === id);

    return (
      student?.fullName ||
      student?.full_name ||
      student?.name ||
      student?.display_name ||
      student?.email ||
      id
    );
  }

  function formatDate(value?: string) {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  const [resultExamFilter, setResultExamFilter] = useState("");
  const [resultProgramFilter, setResultProgramFilter] = useState("");
  const [resultGroupFilter, setResultGroupFilter] = useState("");
  const [resultDateFrom, setResultDateFrom] = useState("");
  const [resultDateTo, setResultDateTo] = useState("");

  function programName(id: string) {
    const levels = data?.levels ?? data?.programs ?? [];
    const program = levels.find((item: any) => item.id === id);

    return program?.name || program?.title || "-";
  }

  function groupProgramId(groupId: string) {
    const group = groups.find((item: any) => item.id === groupId);

    return group?.level_id || group?.levelId || group?.program_id || group?.programId || "";
  }

  function resultRows() {
    const rows = attempts
      .filter((attempt: any) => attempt.status === "submitted")
      .map((attempt: any) => {
        const exam = exams.find((item: any) => item.id === attempt.exam_id);
        const programId = exam ? groupProgramId(exam.group_id) : "";

        return {
          attempt,
          exam,
          student: studentName(attempt.student_id),
          examTitle: exam?.title || "Unknown exam",
          course: exam ? courseName(exam.course_id) : "-",
          group: exam ? groupName(exam.group_id) : "-",
          groupId: exam?.group_id || "",
          programId,
          program: programId ? programName(programId) : "-",
          score: Number(attempt.score || 0),
          total: Number(attempt.total_points || 0),
          percentage: Number(attempt.percentage || 0),
          submittedAt: attempt.submitted_at || attempt.created_at,
        };
      });

    return rows
      .filter((row: any) => !resultExamFilter || row.exam?.id === resultExamFilter)
      .filter((row: any) => !resultProgramFilter || row.programId === resultProgramFilter)
      .filter((row: any) => !resultGroupFilter || row.groupId === resultGroupFilter)
      .filter((row: any) => {
        if (!resultDateFrom) return true;
        if (!row.submittedAt) return false;

        return new Date(row.submittedAt) >= new Date(resultDateFrom + "T00:00:00");
      })
      .filter((row: any) => {
        if (!resultDateTo) return true;
        if (!row.submittedAt) return false;

        return new Date(row.submittedAt) <= new Date(resultDateTo + "T23:59:59");
      })
      .sort((a: any, b: any) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  }

  function ResultFilters() {
    const levels = data?.levels ?? data?.programs ?? [];

    return (
      <div style={filterBox}>
        <strong>Filter CBT Results</strong>

        <div style={filterGrid}>
          <select style={filterInput} value={resultExamFilter} onChange={(e: any) => setResultExamFilter(e.target.value)}>
            <option value="">All exams</option>
            {exams.map((exam: any) => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>

          <select style={filterInput} value={resultProgramFilter} onChange={(e: any) => setResultProgramFilter(e.target.value)}>
            <option value="">All programs</option>
            {levels.map((program: any) => (
              <option key={program.id} value={program.id}>{program.name || program.title}</option>
            ))}
          </select>

          <select style={filterInput} value={resultGroupFilter} onChange={(e: any) => setResultGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((group: any) => (
              <option key={group.id} value={group.id}>{group.name || group.title}</option>
            ))}
          </select>

          <input style={filterInput} type="date" value={resultDateFrom} onChange={(e: any) => setResultDateFrom(e.target.value)} />
          <input style={filterInput} type="date" value={resultDateTo} onChange={(e: any) => setResultDateTo(e.target.value)} />

          <button
            type="button"
            style={lightBtn}
            onClick={() => {
              setResultExamFilter("");
              setResultProgramFilter("");
              setResultGroupFilter("");
              setResultDateFrom("");
              setResultDateTo("");
            }}
          >
            Clear Filters
          </button>
        </div>

        <p style={{ color: C.muted, marginBottom: 0 }}>
          Showing {resultRows().length} submitted CBT result(s).
        </p>
      </div>
    );
  }

  function downloadCbtResults() {
    const rows = resultRows();

    const html = "<html><head><meta charset='UTF-8' />" +
      "<style>" +
      "body{font-family:Arial,sans-serif;color:#0f172a;}" +
      ".header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #166534;padding-bottom:14px;margin-bottom:20px;}" +
      ".logo{width:72px;height:72px;object-fit:contain;}" +
      ".org{font-size:24px;font-weight:bold;color:#052e16;}" +
      ".title{font-size:18px;font-weight:bold;color:#166534;margin-top:4px;}" +
      ".generated{font-size:12px;color:#475569;margin-top:4px;}" +
      "table{border-collapse:collapse;width:100%;margin-top:16px;}" +
      "th{background:#dcfce7;color:#052e16;font-weight:bold;}" +
      "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
      "</style></head><body>" +
      "<div class='header'>" +
      "<img src='/intizar-logo.jpg' class='logo' />" +
      "<div><div class='org'>INTIZAR Academy</div>" +
      "<div class='title'>CBT Results Report</div>" +
      "<div class='generated'>Generated: " + new Date().toLocaleString() + "</div></div>" +
      "</div>" +
      "<table><thead><tr>" +
      "<th>S/N</th><th>Student</th><th>Exam</th><th>Program</th><th>Course</th><th>Group</th><th>Score</th><th>Total</th><th>Percentage</th><th>Submitted At</th>" +
      "</tr></thead><tbody>" +
      rows.map((row: any, index: number) =>
        "<tr>" +
        "<td>" + (index + 1) + "</td>" +
        "<td>" + escapeCell(row.student) + "</td>" +
        "<td>" + escapeCell(row.examTitle) + "</td>" +
        "<td>" + escapeCell(row.program) + "</td>" +
        "<td>" + escapeCell(row.course) + "</td>" +
        "<td>" + escapeCell(row.group) + "</td>" +
        "<td>" + row.score + "</td>" +
        "<td>" + row.total + "</td>" +
        "<td>" + row.percentage + "%</td>" +
        "<td>" + escapeCell(formatDate(row.submittedAt)) + "</td>" +
        "</tr>"
      ).join("") +
      "</tbody></table></body></html>";

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "cbt-results.xls";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function coursesForGroup(groupId: string) {
    const group = groups.find((g: any) => g.id === groupId);
    const levelId = group?.levelId || group?.level_id;

    if (!levelId) return courses;

    const courseIds = levelCourses
      .filter((lc: any) => lc.levelId === levelId || lc.level_id === levelId)
      .map((lc: any) => lc.courseId || lc.course_id);

    return courses.filter((course: any) => courseIds.includes(course.id));
  }

  const availableCourses = useMemo(() => {
    if (!form.groupId) return courses;
    return coursesForGroup(form.groupId);
  }, [form.groupId, courses, groups, levelCourses]);

  function updateQuestion(index: number, patch: Partial<CbtQuestionInput>) {
    setExamQuestions(prev =>
      prev.map((question, qIndex) => {
        if (qIndex !== index) return question;

        const next = { ...question, ...patch };

        if (patch.questionType === "true_false") {
          next.options = [
            { optionText: "True", isCorrect: true },
            { optionText: "False", isCorrect: false },
          ];
        }

        if (patch.questionType === "mcq" && question.questionType !== "mcq") {
          next.options = [
            { optionText: "", isCorrect: true },
            { optionText: "", isCorrect: false },
            { optionText: "", isCorrect: false },
            { optionText: "", isCorrect: false },
          ];
        }

        return next;
      })
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    setExamQuestions(prev =>
      prev.map((question, qIndex) => {
        if (qIndex !== questionIndex) return question;

        return {
          ...question,
          options: question.options.map((option, oIndex) =>
            oIndex === optionIndex ? { ...option, optionText: text } : option
          ),
        };
      })
    );
  }

  function markCorrect(questionIndex: number, optionIndex: number) {
    setExamQuestions(prev =>
      prev.map((question, qIndex) => {
        if (qIndex !== questionIndex) return question;

        return {
          ...question,
          options: question.options.map((option, oIndex) => ({
            ...option,
            isCorrect: oIndex === optionIndex,
          })),
        };
      })
    );
  }

  function isEmptyStarterQuestion(question: CbtQuestionInput) {
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

  function addQuestion() {
    setExamQuestions(prev => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setExamQuestions(prev => prev.length === 1 ? prev : prev.filter((_, qIndex) => qIndex !== index));
  }

  async function submitExam() {
    setSaving(true);

    try {
      const saved = await saveCbtExam({
        ...form,
        questions: examQuestions,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      });

      setExams(prev => [saved, ...prev]);
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        groupId: "",
        courseId: "",
        durationMinutes: 30,
        attemptsAllowed: 1,
        startAt: "",
        endAt: "",
        status: "draft",
        shuffleQuestions: false,
        showResultImmediately: true,
        gradeComponentType: "quiz",
      });
      setExamQuestions([emptyQuestion()]);

      await load();

      alert("CBT exam saved successfully.");
    } catch (err: any) {
      alert(err?.message || "Could not save CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(exam: any, status: "draft" | "published" | "closed") {
    try {
      await updateCbtExamStatus(exam.id, status);
      setExams(prev => prev.map(item => item.id === exam.id ? { ...item, status } : item));
    } catch (err: any) {
      alert(err?.message || "Could not update exam status.");
    }
  }

  async function removeExam(exam: any) {
    const count = attempts.filter((attempt: any) => attempt.exam_id === exam.id).length;

    if (count > 0) {
      alert("This exam already has student attempts. Close it instead of deleting.");
      return;
    }

    const ok = confirm("Delete this CBT exam? This cannot be undone.");

    if (!ok) return;

    try {
      await deleteCbtExam(exam.id);
      setExams(prev => prev.filter(item => item.id !== exam.id));
    } catch (err: any) {
      alert(err?.message || "Could not delete exam.");
    }
  }

  function examQuestionCount(examId: string) {
    return questions.filter((question: any) => question.exam_id === examId).length;
  }

  function examAttemptCount(examId: string) {
    return attempts.filter((attempt: any) => attempt.exam_id === examId).length;
  }

  // Admin CBT Results Only View
  if (adminResultsOnly) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Card>
          <h1 style={{ marginTop: 0 }}>CBT Results</h1>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Admin can view and download submitted CBT results only. Exam creation is restricted to instructors.
          </p>

          <ResultFilters />

          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={downloadCbtResults} style={greenBtn}>
              Download CBT Results
            </button>
          </div>

          {resultRows().length === 0 && (
            <p style={{ color: C.muted }}>No submitted CBT results yet.</p>
          )}

          {resultRows().length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={resultTable}>
                <thead>
                  <tr>
                    <th style={th}>Student</th>
                    <th style={th}>Exam</th>
                    <th style={th}>Program</th>
                    <th style={th}>Course</th>
                    <th style={th}>Group</th>
                    <th style={th}>Score</th>
                    <th style={th}>Percentage</th>
                    <th style={th}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows().map((row: any) => (
                    <tr key={row.attempt.id}>
                      <td style={td}>{row.student}</td>
                      <td style={td}>{row.examTitle}</td>
                      <td style={td}>{row.program}</td>
                      <td style={td}>{row.course}</td>
                      <td style={td}>{row.group}</td>
                      <td style={td}>{row.score} / {row.total}</td>
                      <td style={td}><strong>{row.percentage}%</strong></td>
                      <td style={td}>{formatDate(row.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }


  return (
    <div>
      <PageHeader
        title="CBT Exams"
        sub="Create computer-based tests for your students."
        action={<Button onClick={() => setShowForm(true)}>Create CBT Exam</Button>}
      />

      {loading && <Card><p>Loading CBT exams...</p></Card>}

      {showForm && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Create CBT Exam</h2>

          <div style={grid}>
            <Field label="Exam Title">
              <input style={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>

            <Field label="Group">
              <select
                style={input}
                value={form.groupId}
                onChange={e => setForm({ ...form, groupId: e.target.value, courseId: "" })}
              >
                <option value="">Select group</option>
                {groups.map((group: any) => (
                  <option key={group.id} value={group.id}>{groupName(group.id)}</option>
                ))}
              </select>
            </Field>

            <Field label="Course">
              <select
                style={input}
                value={form.courseId}
                onChange={e => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">Select course</option>
                {availableCourses.map((course: any) => (
                  <option key={course.id} value={course.id}>{courseName(course.id)}</option>
                ))}
              </select>
            </Field>

            <Field label="CBT Type / Grade Component">
              <select
                style={inputStyle}
                value={form.gradeComponentType || "quiz"}
                onChange={(e: any) => setForm({ ...form, gradeComponentType: e.target.value })}
              >
                <option value="quiz">Quiz CBT</option>
                <option value="exam">Exam CBT</option>
              </select>
            </Field>

            <Field label="Duration Minutes">
              <input
                style={input}
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </Field>

            <Field label="Attempts Allowed">
              <input
                style={input}
                type="number"
                min={1}
                value={form.attemptsAllowed}
                onChange={e => setForm({ ...form, attemptsAllowed: Number(e.target.value) })}
              />
            </Field>

            <Field label="Status">
              <select
                style={input}
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field label="Start Date/Time">
              <input
                style={input}
                type="datetime-local"
                value={form.startAt}
                onChange={e => setForm({ ...form, startAt: e.target.value })}
              />
            </Field>

            <Field label="End Date/Time">
              <input
                style={input}
                type="datetime-local"
                value={form.endAt}
                onChange={e => setForm({ ...form, endAt: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              style={{ ...input, minHeight: 80 }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })}
              />
              Shuffle questions
            </label>

            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={form.showResultImmediately}
                onChange={e => setForm({ ...form, showResultImmediately: e.target.checked })}
              />
              Show result immediately
            </label>
          </div>

          <div style={importBox}>
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
              placeholder={"1. What is Akhlaq?\nA. Good character\nB. Food\nC. Computer\nD. Money\nAnswer: A"}
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

          <h3>Questions</h3>

          <div style={{ display: "grid", gap: 16 }}>
            {examQuestions.map((question, qIndex) => (
              <div key={qIndex} style={questionBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>Question {qIndex + 1}</strong>
                  <button type="button" onClick={() => removeQuestion(qIndex)} style={smallDanger}>
                    Remove
                  </button>
                </div>

                <div style={grid}>
                  <Field label="Question Type">
                    <select
                      style={input}
                      value={question.questionType}
                      onChange={e => updateQuestion(qIndex, { questionType: e.target.value as any })}
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </Field>

                  <Field label="Points">
                    <input
                      style={input}
                      type="number"
                      min={1}
                      value={question.points}
                      onChange={e => updateQuestion(qIndex, { points: Number(e.target.value) })}
                    />
                  </Field>
                </div>

                <Field label="Question Text">
                  <textarea
                    style={{ ...input, minHeight: 80 }}
                    value={question.questionText}
                    onChange={e => updateQuestion(qIndex, { questionText: e.target.value })}
                  />
                </Field>

                <div style={{ display: "grid", gap: 8 }}>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} style={optionRow}>
                      <input
                        type="radio"
                        checked={option.isCorrect}
                        onChange={() => markCorrect(qIndex, oIndex)}
                      />

                      <input
                        style={input}
                        value={option.optionText}
                        disabled={question.questionType === "true_false"}
                        placeholder={"Option " + (oIndex + 1)}
                        onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Button onClick={addQuestion}>Add Question</Button>
            <Button onClick={submitExam} disabled={saving}>{saving ? "Saving..." : "Save CBT Exam"}</Button>
            <button type="button" onClick={() => setShowForm(false)} style={secondaryBtn}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ marginTop: 0 }}>CBT Results</h2>
        <p style={{ color: C.muted, marginTop: 0 }}>
          View submitted CBT attempts and download official result sheet.
        </p>

        <ResultFilters />

          <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={downloadCbtResults} style={greenBtn}>
            Download CBT Results
          </button>
        </div>

        {resultRows().length === 0 && (
          <p style={{ color: C.muted }}>No submitted CBT results yet.</p>
        )}

        {resultRows().length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={resultTable}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={th}>Exam</th>
                  <th style={th}>Course</th>
                  <th style={th}>Group</th>
                  <th style={th}>Score</th>
                  <th style={th}>Percentage</th>
                  <th style={th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {resultRows().map((row: any) => (
                  <tr key={row.attempt.id}>
                    <td style={td}>{row.student}</td>
                    <td style={td}>{row.examTitle}</td>
                    <td style={td}>{row.course}</td>
                    <td style={td}>{row.group}</td>
                    <td style={td}>{row.score} / {row.total}</td>
                    <td style={td}><strong>{row.percentage}%</strong></td>
                    <td style={td}>{formatDate(row.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>Created CBT Exams</h2>

        {exams.length === 0 && (
          <p style={{ color: C.muted }}>No CBT exams created yet.</p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {exams.map((exam: any) => (
            <div key={exam.id} style={examCard}>
              <div>
                <h3 style={{ margin: 0 }}>{exam.title}</h3>
                <p style={{ margin: "6px 0", color: C.muted }}>
                  {groupName(exam.group_id)} • {courseName(exam.course_id)} • {exam.duration_minutes} minutes
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge>{exam.status} · Grade Component: {exam.grade_component_type || "quiz"}</Badge>
                  <Badge>{examQuestionCount(exam.id)} questions</Badge>
                  <Badge>{exam.total_points} points</Badge>
                  <Badge>{examAttemptCount(exam.id)} attempts</Badge>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {exam.status !== "published" && (
                  <button type="button" style={greenBtn} onClick={() => changeStatus(exam, "published")}>
                    Publish
                  </button>
                )}

                {exam.status !== "closed" && (
                  <button type="button" style={secondaryBtn} onClick={() => changeStatus(exam, "closed")}>
                    Close
                  </button>
                )}

                <button type="button" style={dangerBtn} onClick={() => removeExam(exam)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function escapeCell(value: any) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function Field({ label, children }: any) {
  return (
    <label style={{ display: "grid", gap: 6, fontWeight: 800, color: C.dark }}>
      {label}
      {children}
    </label>
  );
}

function Badge({ children }: any) {
  return (
    <span style={{
      borderRadius: 999,
      padding: "4px 9px",
      background: "#dcfce7",
      color: C.dark,
      fontWeight: 800,
      fontSize: 12,
    }}>
      {children}
    </span>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const input = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 12,
  padding: "11px 12px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
};

const importBox = {
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

const questionBox = {
  border: "1px solid #dbe3ef",
  borderRadius: 16,
  padding: 14,
  background: C.soft,
};

const optionRow = {
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  alignItems: "center",
  gap: 8,
};

const examCard = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff",
};

const greenBtn = {
  border: 0,
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  background: C.green,
  color: "#ffffff",
};

const dangerBtn = {
  border: 0,
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  background: C.danger,
  color: "#ffffff",
};

const secondaryBtn = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  background: "#ffffff",
  color: C.dark,
};

const smallDanger = {
  ...dangerBtn,
  padding: "6px 9px",
  fontSize: 12,
};

const lightBtn = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: C.dark,
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const filterBox = {
  border: "1px solid #dbe3ef",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
  marginBottom: 14,
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

const filterInput = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 11px",
  fontWeight: 700,
  boxSizing: "border-box" as const,
  background: "#ffffff",
};

const resultTable = {
  borderCollapse: "collapse" as const,
  width: "100%",
  minWidth: 850,
};

const th = {
  border: "1px solid #dbe3ef",
  padding: 10,
  background: "#dcfce7",
  color: C.dark,
  textAlign: "left" as const,
};

const td = {
  border: "1px solid #dbe3ef",
  padding: 10,
  color: C.dark,
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
  color: C.dark,
};
