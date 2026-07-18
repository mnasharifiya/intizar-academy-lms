import { useEffect, useMemo, useState } from "react";
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
        ...prev.filter((attempt: any) => attempt.id !== (result as any).id),
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
          const scheduleStatus = getCbtScheduleStatus(exam);
          const scheduleOpen = scheduleStatus === "Open now";
          const canStart = scheduleOpen && (Boolean(inProgress) || submitted < allowed);

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

                  <CbtScheduleBlock exam={exam} />

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>{scheduleStatus}</Badge>
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
                    {!scheduleOpen ? scheduleStatus : inProgress ? "Continue Exam" : canStart ? "Start Exam" : "Attempts Used"}
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

function formatCbtDateTime(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return String(value);
  }
}

function formatCbtDate(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleDateString([], {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getCbtScheduleStatus(exam: any) {
  const now = new Date();
  const start = exam.start_at ? new Date(exam.start_at) : null;
  const end = exam.end_at ? new Date(exam.end_at) : null;

  if (start && now < start) return "Not started";
  if (end && now > end) return "Ended";

  return "Open now";
}

function getCbtScheduleColor(exam: any) {
  const status = getCbtScheduleStatus(exam);

  if (status === "Open now") return "#166534";
  if (status === "Not started") return "#92400e";

  return "#991b1b";
}

function CbtScheduleBlock({ exam }: any) {
  return (
    <div style={scheduleBox}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <strong>CBT Schedule</strong>
        <span style={{ color: getCbtScheduleColor(exam), fontWeight: 900 }}>
          {getCbtScheduleStatus(exam)}
        </span>
      </div>

      <div style={scheduleGrid}>
        <div style={scheduleItem}>
          <div style={scheduleLabel}>Exam Date</div>
          <div style={scheduleValue}>{formatCbtDate(exam.start_at || exam.created_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>Start Time</div>
          <div style={scheduleValue}>{formatCbtDateTime(exam.start_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>End Time</div>
          <div style={scheduleValue}>{formatCbtDateTime(exam.end_at)}</div>
        </div>

        <div style={scheduleItem}>
          <div style={scheduleLabel}>Duration</div>
          <div style={scheduleValue}>{exam.duration_minutes || 0} minutes</div>
        </div>
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

const scheduleBox = {
  display: "grid",
  gap: 8,
  padding: 12,
  border: "1px solid #dbe3ef",
  borderRadius: 14,
  background: "#f8fafc",
  margin: "12px 0",
};

const scheduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const scheduleItem = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 10,
  background: "#ffffff",
};

const scheduleLabel = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
  marginBottom: 4,
};

const scheduleValue = {
  color: "#0f172a",
  fontWeight: 900,
};

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
