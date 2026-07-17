const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, text) {
  fs.writeFileSync(path, text, "utf8");
}

const apiText = read("src/lib/api.ts");
const supabaseImport =
  apiText.split(/\r?\n/).find(line => line.includes("supabase") && line.includes("from")) ||
  `import { supabase } from "./supabase";`;

const cbtApi = `${supabaseImport}

export type CbtExamStatus = "draft" | "published" | "closed";

export type CbtQuestionInput = {
  questionText: string;
  questionType: "mcq" | "true_false";
  points: number;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
};

export type CbtExamInput = {
  title: string;
  description?: string;
  courseId: string;
  groupId: string;
  durationMinutes: number;
  attemptsAllowed: number;
  startAt?: string | null;
  endAt?: string | null;
  status: CbtExamStatus;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  questions: CbtQuestionInput[];
};

export async function loadCbtExams() {
  const [examsRes, questionsRes, optionsRes, attemptsRes] = await Promise.all([
    supabase.from("cbt_exams").select("*").order("created_at", { ascending: false }),
    supabase.from("cbt_questions").select("*").order("sort_order", { ascending: true }),
    supabase.from("cbt_options").select("*").order("sort_order", { ascending: true }),
    supabase.from("cbt_attempts").select("*").order("created_at", { ascending: false }),
  ]);

  if (examsRes.error) throw examsRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (optionsRes.error) throw optionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  return {
    exams: examsRes.data ?? [],
    questions: questionsRes.data ?? [],
    options: optionsRes.data ?? [],
    attempts: attemptsRes.data ?? [],
  };
}

export async function saveCbtExam(input: CbtExamInput) {
  if (!input.title.trim()) throw new Error("Exam title is required.");
  if (!input.groupId) throw new Error("Group is required.");
  if (!input.courseId) throw new Error("Course is required.");
  if (!input.durationMinutes || input.durationMinutes < 1) throw new Error("Duration must be at least 1 minute.");
  if (!input.questions.length) throw new Error("Add at least one question.");

  input.questions.forEach((question, index) => {
    if (!question.questionText.trim()) {
      throw new Error("Question " + (index + 1) + " text is required.");
    }

    if (!question.points || question.points <= 0) {
      throw new Error("Question " + (index + 1) + " points must be greater than 0.");
    }

    if (question.questionType === "mcq" && question.options.length < 2) {
      throw new Error("Question " + (index + 1) + " needs at least two options.");
    }

    if (question.questionType === "true_false" && question.options.length !== 2) {
      throw new Error("True/False question " + (index + 1) + " must have True and False options.");
    }

    const correctCount = question.options.filter(option => option.isCorrect).length;

    if (correctCount !== 1) {
      throw new Error("Question " + (index + 1) + " must have exactly one correct answer.");
    }
  });

  const totalPoints = input.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);

  const { data: exam, error: examError } = await supabase
    .from("cbt_exams")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      course_id: input.courseId,
      group_id: input.groupId,
      duration_minutes: input.durationMinutes,
      attempts_allowed: input.attemptsAllowed,
      start_at: input.startAt || null,
      end_at: input.endAt || null,
      status: input.status,
      shuffle_questions: input.shuffleQuestions,
      show_result_immediately: input.showResultImmediately,
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (examError) throw examError;

  for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
    const question = input.questions[qIndex];

    const { data: savedQuestion, error: questionError } = await supabase
      .from("cbt_questions")
      .insert({
        exam_id: exam.id,
        question_text: question.questionText.trim(),
        question_type: question.questionType,
        points: question.points,
        sort_order: qIndex + 1,
      })
      .select("*")
      .single();

    if (questionError) throw questionError;

    const optionRows = question.options.map((option, optionIndex) => ({
      question_id: savedQuestion.id,
      option_text: option.optionText.trim(),
      is_correct: option.isCorrect,
      sort_order: optionIndex + 1,
    }));

    const { error: optionsError } = await supabase.from("cbt_options").insert(optionRows);

    if (optionsError) throw optionsError;
  }

  return exam;
}

export async function deleteCbtExam(examId: string) {
  const { error } = await supabase
    .from("cbt_exams")
    .delete()
    .eq("id", examId);

  if (error) throw error;

  return true;
}

export async function updateCbtExamStatus(examId: string, status: CbtExamStatus) {
  const { error } = await supabase
    .from("cbt_exams")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", examId);

  if (error) throw error;

  return true;
}
`;

write("src/lib/cbtApi.ts", cbtApi);

const cbtPage = `import { useEffect, useMemo, useState } from "react";
import { Button, Card, PageHeader } from "../../components/common/ui";
import { deleteCbtExam, loadCbtExams, saveCbtExam, updateCbtExamStatus, type CbtQuestionInput } from "../../lib/cbtApi";

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

export default function InstructorCbtExamsPage({ data, user }: any) {
  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
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
  });

  const [examQuestions, setExamQuestions] = useState<CbtQuestionInput[]>([emptyQuestion()]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const result = await loadCbtExams();
      setExams(result.exams);
      setQuestions(result.questions);
      setOptions(result.options);
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
                  <Badge>{exam.status}</Badge>
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

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
  color: C.dark,
};
`;

write("src/pages/instructor/CbtExams.tsx", cbtPage);

// Patch AppLayout menu
let layout = read("src/components/layout/AppLayout.tsx");

if (!layout.includes('id: "cbt-exams"')) {
  layout = layout.replace(
    /(\{ id: "score-entry"[\s\S]*?\},)/,
    `$1
  { id: "cbt-exams", label: "CBT Exams" },`
  );

  layout = layout.replace(
    /(\{ id: "teaching"[\s\S]*?\},)/,
    `$1
  { id: "cbt-exams", label: "CBT Exams" },`
  );
}

write("src/components/layout/AppLayout.tsx", layout);

// Patch App route
let app = read("src/App.tsx");

if (!app.includes('InstructorCbtExamsPage')) {
  app = app.replace(
    /(import .*ScoreEntry.*;\r?\n)/,
    `$1import InstructorCbtExamsPage from "./pages/instructor/CbtExams";\n`
  );

  if (!app.includes('if (page === "cbt-exams")')) {
    app = app.replace(
      /(if \(page === "score-entry"[\s\S]*?;\r?\n)/,
      `$1    if (page === "cbt-exams") return <InstructorCbtExamsPage data={scopedData} user={user} />;\n`
    );

    app = app.replace(
      /(if \(page === "teaching"[\s\S]*?;\r?\n)/,
      `$1    if (page === "cbt-exams") return <InstructorCbtExamsPage data={scopedData} user={user} />;\n`
    );
  }
}

write("src/App.tsx", app);

console.log("CBT Phase 2 files created and routes patched.");
