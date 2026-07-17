const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, text) {
  fs.writeFileSync(path, text, "utf8");
}

/* -----------------------------
   1. Add student CBT API methods
------------------------------ */
const apiPath = "src/lib/cbtApi.ts";
let api = read(apiPath);

if (!api.includes("export async function loadStudentCbtData")) {
  api += `

export async function loadStudentCbtData(groupIds: string[]) {
  if (!groupIds.length) {
    return {
      exams: [],
      questions: [],
      options: [],
      attempts: [],
    };
  }

  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const now = new Date().toISOString();

  const [examsRes, attemptsRes] = await Promise.all([
    supabase
      .from("cbt_exams")
      .select("*")
      .eq("status", "published")
      .in("group_id", groupIds)
      .or("start_at.is.null,start_at.lte." + now)
      .or("end_at.is.null,end_at.gte." + now)
      .order("created_at", { ascending: false }),

    supabase
      .from("cbt_attempts")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (examsRes.error) throw examsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const exams = examsRes.data ?? [];
  const examIds = exams.map((exam: any) => exam.id);

  if (!examIds.length) {
    return {
      exams,
      questions: [],
      options: [],
      attempts: attemptsRes.data ?? [],
    };
  }

  const questionsRes = await supabase
    .from("cbt_questions")
    .select("id, exam_id, question_text, question_type, points, sort_order")
    .in("exam_id", examIds)
    .order("sort_order", { ascending: true });

  if (questionsRes.error) throw questionsRes.error;

  const questionIds = (questionsRes.data ?? []).map((question: any) => question.id);

  let optionRows: any[] = [];

  if (questionIds.length) {
    const optionsRes = await supabase
      .from("cbt_options")
      .select("id, question_id, option_text, sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (optionsRes.error) throw optionsRes.error;

    optionRows = optionsRes.data ?? [];
  }

  return {
    exams,
    questions: questionsRes.data ?? [],
    options: optionRows,
    attempts: attemptsRes.data ?? [],
  };
}

export async function startCbtAttempt(examId: string) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const { data: exam, error: examError } = await supabase
    .from("cbt_exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (examError) throw examError;

  if ((exam as any).status !== "published") {
    throw new Error("This exam is not published.");
  }

  const now = new Date();

  if ((exam as any).start_at && now < new Date((exam as any).start_at)) {
    throw new Error("This exam has not started yet.");
  }

  if ((exam as any).end_at && now > new Date((exam as any).end_at)) {
    throw new Error("This exam has ended.");
  }

  const { data: previousAttempts, error: attemptsError } = await supabase
    .from("cbt_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (attemptsError) throw attemptsError;

  const existingInProgress = (previousAttempts ?? []).find((attempt: any) => attempt.status === "in_progress");

  if (existingInProgress) return existingInProgress;

  const submittedCount = (previousAttempts ?? []).filter((attempt: any) => attempt.status === "submitted").length;

  if (submittedCount >= Number((exam as any).attempts_allowed || 1)) {
    throw new Error("You have already used your allowed attempt(s) for this exam.");
  }

  const { data: attempt, error } = await supabase
    .from("cbt_attempts")
    .insert({
      exam_id: examId,
      student_id: userId,
      total_points: Number((exam as any).total_points || 0),
      status: "in_progress",
    })
    .select("*")
    .single();

  if (error) throw error;

  return attempt;
}

export async function submitCbtAttempt(
  attemptId: string,
  answers: { questionId: string; selectedOptionId: string }[]
) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const { data: attempt, error: attemptError } = await supabase
    .from("cbt_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError) throw attemptError;

  if ((attempt as any).student_id !== userId) {
    throw new Error("This attempt does not belong to you.");
  }

  if ((attempt as any).status !== "in_progress") {
    throw new Error("This attempt is already submitted.");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("cbt_questions")
    .select("*")
    .eq("exam_id", (attempt as any).exam_id);

  if (questionsError) throw questionsError;

  const questionIds = (questions ?? []).map((question: any) => question.id);

  const { data: options, error: optionsError } = await supabase
    .from("cbt_options")
    .select("*")
    .in("question_id", questionIds);

  if (optionsError) throw optionsError;

  const answerRows = (questions ?? []).map((question: any) => {
    const selected = answers.find(answer => answer.questionId === question.id);
    const selectedOption = (options ?? []).find((option: any) => option.id === selected?.selectedOptionId);
    const isCorrect = Boolean(selectedOption?.is_correct);
    const pointsAwarded = isCorrect ? Number(question.points || 0) : 0;

    return {
      attempt_id: attemptId,
      question_id: question.id,
      selected_option_id: selected?.selectedOptionId || null,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    };
  });

  if (answerRows.length) {
    const { error: answersError } = await supabase
      .from("cbt_answers")
      .upsert(answerRows, {
        onConflict: "attempt_id,question_id",
      });

    if (answersError) throw answersError;
  }

  const totalPoints = (questions ?? []).reduce((sum: number, question: any) => sum + Number(question.points || 0), 0);
  const score = answerRows.reduce((sum: number, row: any) => sum + Number(row.points_awarded || 0), 0);
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 10000) / 100 : 0;

  const { data: updatedAttempt, error: updateError } = await supabase
    .from("cbt_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score,
      total_points: totalPoints,
      percentage,
      status: "submitted",
    })
    .eq("id", attemptId)
    .select("*")
    .single();

  if (updateError) throw updateError;

  return updatedAttempt;
}
`;
}

write(apiPath, api);

/* -----------------------------
   2. Create student page
------------------------------ */
const studentPage = `import { useEffect, useMemo, useState } from "react";
import { Button, Card, PageHeader } from "../../components/common/ui";
import { loadStudentCbtData, startCbtAttempt, submitCbtAttempt } from "../../lib/cbtApi";

const C = {
  green: "#16a34a",
  dark: "#052e16",
  muted: "#64748b",
  border: "#e5e7eb",
  soft: "#f8fafc",
  danger: "#dc2626",
};

export default function StudentCbtExamsPage({ data }: any) {
  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];

  const groupIds = useMemo(() => groups.map((group: any) => group.id).filter(Boolean), [groups]);

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  const [activeExam, setActiveExam] = useState<any>(null);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [groupIds.join(",")]);

  useEffect(() => {
    if (!activeExam || !activeAttempt) return;

    const timer = setInterval(() => {
      const started = new Date(activeAttempt.started_at).getTime();
      const durationMs = Number(activeExam.duration_minutes || 0) * 60 * 1000;
      const end = started + durationMs;
      const remain = Math.max(0, Math.floor((end - Date.now()) / 1000));

      setRemainingSeconds(remain);

      if (remain <= 0) {
        clearInterval(timer);
        submitNow(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam?.id, activeAttempt?.id]);

  async function load() {
    setLoading(true);

    try {
      const result = await loadStudentCbtData(groupIds);

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

  function examQuestions(examId: string) {
    return questions
      .filter((question: any) => question.exam_id === examId)
      .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }

  function questionOptions(questionId: string) {
    return options
      .filter((option: any) => option.question_id === questionId)
      .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }

  function latestAttempt(examId: string) {
    return attempts.find((attempt: any) => attempt.exam_id === examId);
  }

  function submittedAttempts(examId: string) {
    return attempts.filter((attempt: any) => attempt.exam_id === examId && attempt.status === "submitted");
  }

  function inProgressAttempt(examId: string) {
    return attempts.find((attempt: any) => attempt.exam_id === examId && attempt.status === "in_progress");
  }

  async function startExam(exam: any) {
    try {
      const attempt = await startCbtAttempt(exam.id);

      setActiveExam(exam);
      setActiveAttempt(attempt);
      setAnswers({});

      await load();
    } catch (err: any) {
      alert(err?.message || "Could not start exam.");
    }
  }

  function selectAnswer(questionId: string, optionId: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  async function submitNow(auto = false) {
    if (!activeExam || !activeAttempt || submitting) return;

    if (!auto) {
      const ok = confirm("Submit this CBT exam now?");
      if (!ok) return;
    }

    setSubmitting(true);

    try {
      const rows = examQuestions(activeExam.id).map((question: any) => ({
        questionId: question.id,
        selectedOptionId: answers[question.id] || "",
      }));

      const result = await submitCbtAttempt(activeAttempt.id, rows);

      setAttempts(prev => [
        result,
        ...prev.filter((attempt: any) => attempt.id !== result.id),
      ]);

      setActiveAttempt(result);

      alert(auto ? "Time is up. Exam submitted." : "Exam submitted successfully.");
    } catch (err: any) {
      alert(err?.message || "Could not submit exam.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(totalSeconds: number) {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;

    return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  if (activeExam && activeAttempt && activeAttempt.status === "submitted") {
    return (
      <div>
        <PageHeader title="CBT Result" sub={activeExam.title} />

        <Card>
          <h2 style={{ marginTop: 0 }}>Exam Submitted</h2>

          {activeExam.show_result_immediately ? (
            <div style={resultBox}>
              <div>
                <strong>Score</strong>
                <div style={resultNumber}>{activeAttempt.score} / {activeAttempt.total_points}</div>
              </div>

              <div>
                <strong>Percentage</strong>
                <div style={resultNumber}>{activeAttempt.percentage}%</div>
              </div>
            </div>
          ) : (
            <p style={{ color: C.muted }}>
              Your exam was submitted. The result will be released by the instructor.
            </p>
          )}

          <Button
            onClick={() => {
              setActiveExam(null);
              setActiveAttempt(null);
              setAnswers({});
              load();
            }}
          >
            Back to CBT Exams
          </Button>
        </Card>
      </div>
    );
  }

  if (activeExam && activeAttempt) {
    const qs = examQuestions(activeExam.id);
    const answeredCount = qs.filter((question: any) => answers[question.id]).length;

    return (
      <div>
        <PageHeader
          title={activeExam.title}
          sub={courseName(activeExam.course_id) + " CBT Exam"}
        />

        <Card>
          <div style={examTop}>
            <div>
              <strong>Timer</strong>
              <div style={{
                ...timerText,
                color: remainingSeconds <= 60 ? C.danger : C.dark,
              }}>
                {formatTime(remainingSeconds)}
              </div>
            </div>

            <div>
              <strong>Progress</strong>
              <div style={progressText}>{answeredCount} / {qs.length} answered</div>
            </div>

            <button type="button" onClick={() => submitNow(false)} disabled={submitting} style={greenBtn}>
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </Card>

        <div style={{ display: "grid", gap: 14 }}>
          {qs.map((question: any, index: number) => (
            <Card key={question.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ marginTop: 0 }}>Question {index + 1}</h3>
                <strong>{question.points} point(s)</strong>
              </div>

              <p style={{ fontWeight: 800 }}>{question.question_text}</p>

              <div style={{ display: "grid", gap: 10 }}>
                {questionOptions(question.id).map((option: any) => {
                  const checked = answers[question.id] === option.id;

                  return (
                    <label
                      key={option.id}
                      style={{
                        ...optionBox,
                        borderColor: checked ? C.green : C.border,
                        background: checked ? "#f0fdf4" : "#ffffff",
                      }}
                    >
                      <input
                        type="radio"
                        name={"question-" + question.id}
                        checked={checked}
                        onChange={() => selectAnswer(question.id, option.id)}
                      />
                      <span>{option.option_text}</span>
                    </label>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <button type="button" onClick={() => submitNow(false)} disabled={submitting} style={greenBtn}>
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="CBT Exams"
        sub="Take your published computer-based exams."
      />

      {loading && <Card><p>Loading CBT exams...</p></Card>}

      {!loading && groupIds.length === 0 && (
        <Card>
          <p style={{ color: C.muted }}>
            You are not assigned to any active group yet. CBT exams will appear after your group assignment.
          </p>
        </Card>
      )}

      {!loading && exams.length === 0 && groupIds.length > 0 && (
        <Card>
          <p style={{ color: C.muted }}>No published CBT exams available now.</p>
        </Card>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {exams.map((exam: any) => {
          const latest = latestAttempt(exam.id);
          const inProgress = inProgressAttempt(exam.id);
          const submitted = submittedAttempts(exam.id).length;
          const allowed = Number(exam.attempts_allowed || 1);
          const canStart = Boolean(inProgress) || submitted < allowed;

          return (
            <Card key={exam.id}>
              <div style={examListCard}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{exam.title}</h2>
                  <p style={{ color: C.muted }}>
                    {courseName(exam.course_id)} • {exam.duration_minutes} minutes • {exam.total_points} points
                  </p>

                  {exam.description && (
                    <p>{exam.description}</p>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>{examQuestions(exam.id).length} questions</Badge>
                    <Badge>{submitted} / {allowed} attempts used</Badge>
                    {latest?.status === "submitted" && <Badge>Submitted: {latest.percentage}%</Badge>}
                    {inProgress && <Badge>In progress</Badge>}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={!canStart}
                    onClick={() => startExam(exam)}
                    style={{
                      ...greenBtn,
                      opacity: canStart ? 1 : 0.55,
                      cursor: canStart ? "pointer" : "not-allowed",
                    }}
                  >
                    {inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
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

const examListCard = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
};

const examTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
};

const timerText = {
  fontWeight: 1000,
  fontSize: 30,
};

const progressText = {
  fontWeight: 900,
  color: C.dark,
};

const optionBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  cursor: "pointer",
  fontWeight: 800,
};

const greenBtn = {
  border: 0,
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  background: C.green,
  color: "#ffffff",
};

const resultBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const resultNumber = {
  fontSize: 34,
  fontWeight: 1000,
  color: C.green,
};
`;

write("src/pages/student/CbtExams.tsx", studentPage);

/* -----------------------------
   3. Patch AppLayout menu
------------------------------ */
let layout = read("src/components/layout/AppLayout.tsx");

layout = layout.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];/,
  (match, names) => {
    if (names.includes("ClipboardList")) return match;
    return `import {${names}, ClipboardList } from "lucide-react";`;
  }
);

if (!layout.includes('id: "student-cbt-exams"')) {
  layout = layout.replace(
    /(\{ id: "grades"[\s\S]*?\},)/,
    `$1
  { id: "student-cbt-exams", label: "CBT Exams", icon: ClipboardList },`
  );
}

write("src/components/layout/AppLayout.tsx", layout);

/* -----------------------------
   4. Patch App route
------------------------------ */
let app = read("src/App.tsx");

if (!app.includes("StudentCbtExamsPage")) {
  app = app.replace(
    /(import .*student\/Grades.*;\r?\n)/,
    `$1import StudentCbtExamsPage from "./pages/student/CbtExams";\n`
  );
}

if (!app.includes('page === "student-cbt-exams"')) {
  app = app.replace(
    /(if \(page === "grades"[\s\S]*?;\r?\n)/,
    `$1    if (page === "student-cbt-exams") return <StudentCbtExamsPage data={scopedData} />;\n`
  );
}

write("src/App.tsx", app);

console.log("Student CBT Phase 3 added.");
