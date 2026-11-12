import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button, Card, Input, PageHeader } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import {
  createSpecialProgramSignedUrl,
  getProgramQuizOptionsSafe,
  loadSpecialProgramsOverviewList,
  loadStudentProgramWorkspace,
  manageProgramEnrollment,
  postProgramDiscussion,
  recordLessonProgressSecure,
  startProgramQuizAttempt,
  submitProgramQuizAttempt,
  toggleLessonBookmark,
  type LessonProgressRecord,
  type ProgramCertificate,
  type ProgramCourse,
  type ProgramDiscussion,
  type ProgramEnrollment,
  type ProgramLesson,
  type ProgramLessonBookmark,
  type ProgramQuiz,
  type ProgramQuizAttempt,
  type ProgramQuizOption,
  type ProgramQuizQuestion,
  type ProgramResource,
  type ProgramSection,
  type SpecialProgram,
} from "../../lib/specialProgramsApi";

function toEmbedVideoUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (url.pathname.startsWith("/embed/")) return rawUrl;
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (url.hostname.includes("vimeo.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function StudentSpecialProgramsView({
  user,
  data: _data,
}: {
  user: any;
  data: any;
}) {
  const [catalogue, setCatalogue] = useState<SpecialProgram[]>([]);
  const [allCourses, setAllCourses] = useState<ProgramCourse[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<ProgramEnrollment[]>([]);
  const [myCertificates, setMyCertificates] = useState<ProgramCertificate[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);

  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [program, setProgram] = useState<SpecialProgram | null>(null);
  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [certificate, setCertificate] = useState<ProgramCertificate | null>(null);
  const [courses, setCourses] = useState<ProgramCourse[]>([]);
  const [prerequisites, setPrerequisites] = useState<
    Array<{ courseId: string; prerequisiteCourseId: string }>
  >([]);
  const [sections, setSections] = useState<ProgramSection[]>([]);
  const [lessons, setLessons] = useState<ProgramLesson[]>([]);
  const [resources, setResources] = useState<ProgramResource[]>([]);
  const [quizzes, setQuizzes] = useState<ProgramQuiz[]>([]);
  const [questions, setQuestions] = useState<ProgramQuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<ProgramQuizAttempt[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<ProgramLessonBookmark[]>([]);
  const [discussions, setDiscussions] = useState<ProgramDiscussion[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [signedMediaUrl, setSignedMediaUrl] = useState<string>("");
  const [showCertificateCard, setShowCertificateCard] = useState(false);

  const [activeAttempt, setActiveAttempt] = useState<ProgramQuizAttempt | null>(null);
  const [attemptOptions, setAttemptOptions] = useState<ProgramQuizOption[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [quizResultBanner, setQuizResultBanner] = useState<string>("");

  const [discussionBody, setDiscussionBody] = useState("");
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedPosRef = useRef<number>(0);

  async function refreshCatalogue() {
    try {
      setLoadingCatalogue(true);
      const res = await loadSpecialProgramsOverviewList();
      setCatalogue(res.programs);
      setAllCourses(res.courses);
      setMyEnrollments(res.enrollments.filter(e => e.studentId === user.id));
      setMyCertificates(res.certificates.filter(c => c.studentId === user.id));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not load Special Programs catalogue.");
    } finally {
      setLoadingCatalogue(false);
    }
  }

  async function openWorkspace(programId: string) {
    try {
      setActiveProgramId(programId);
      setWorkspaceLoading(true);
      setActiveAttempt(null);
      setAttemptOptions([]);
      setSelectedAnswers({});
      setQuizResultBanner("");
      setShowCertificateCard(false);

      const ws = await loadStudentProgramWorkspace(programId);
      setProgram(ws.program);
      setEnrollment(ws.enrollment);
      setCertificate(ws.certificate);
      setCourses(ws.courses);
      setPrerequisites(ws.prerequisites);
      setSections(ws.sections);
      setLessons(ws.lessons);
      setResources(ws.resources);
      setQuizzes(ws.quizzes);
      setQuestions(ws.questions);
      setAttempts(ws.attempts);
      setLessonProgress(ws.lessonProgress);
      setBookmarks(ws.bookmarks);
      setDiscussions(ws.discussions);

      const profilesRes = await (supabase as any).rpc("get_program_member_profiles", {
        p_program_id: programId,
      });
      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        const map: Record<string, any> = {};
        profilesRes.data.forEach((p: any) => {
          map[p.id] = p;
        });
        setMemberProfiles(map);
      }

      const resumeLesson = ws.enrollment?.lastLessonId
        ? ws.lessons.find(l => l.id === ws.enrollment?.lastLessonId)
        : null;
      const firstLesson = resumeLesson ?? ws.lessons[0] ?? null;

      if (firstLesson) {
        setSelectedCourseId(firstLesson.courseId);
        setSelectedLessonId(firstLesson.id);
        setSelectedQuizId("");
      } else if (ws.courses[0]) {
        setSelectedCourseId(ws.courses[0].id);
        setSelectedLessonId("");
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not open Special Program workspace.");
      setActiveProgramId(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    refreshCatalogue();
  }, []);

  const completedCourseIds = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      const reqLessons = lessons.filter(l => l.courseId === c.id && l.isRequired);
      const reqQuizzes = quizzes.filter(q => q.courseId === c.id && q.isRequired);
      if (reqLessons.length === 0 && reqQuizzes.length === 0) return;

      const allLessonsDone = reqLessons.every(l =>
        lessonProgress.some(lp => lp.lessonId === l.id && lp.status === "completed")
      );
      const allQuizzesPassed = reqQuizzes.every(q =>
        attempts.some(a => a.quizId === q.id && a.status === "submitted" && a.passed === true)
      );

      if (allLessonsDone && allQuizzesPassed) {
        set.add(c.id);
      }
    });
    return set;
  }, [courses, lessons, quizzes, lessonProgress, attempts]);

  const unlockedCourseIds = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      const reqs = prerequisites.filter(p => p.courseId === c.id);
      const met = reqs.every(r => completedCourseIds.has(r.prerequisiteCourseId));
      if (met) set.add(c.id);
    });
    return set;
  }, [courses, prerequisites, completedCourseIds]);

  const activeLesson = useMemo(
    () => lessons.find(l => l.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId]
  );

  const activeQuiz = useMemo(
    () => quizzes.find(q => q.id === selectedQuizId) ?? null,
    [quizzes, selectedQuizId]
  );

  const activeLessonProgress = useMemo(
    () =>
      activeLesson
        ? lessonProgress.find(lp => lp.lessonId === activeLesson.id) ?? null
        : null,
    [activeLesson, lessonProgress]
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveMedia() {
      setSignedMediaUrl("");
      if (!activeLesson?.mediaStoragePath) return;
      try {
        const url = await createSpecialProgramSignedUrl(activeLesson.mediaStoragePath, 3600);
        if (!cancelled) setSignedMediaUrl(url);
      } catch (err) {
        console.error(err);
      }
    }
    resolveMedia();
    lastReportedPosRef.current = activeLessonProgress?.lastPositionSeconds ?? 0;
  }, [activeLesson?.id, activeLesson?.mediaStoragePath]);

  useEffect(() => {
    if (!activeLesson || activeLesson.lessonType !== "video") return;
    if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) return;

    const timer = window.setInterval(async () => {
      if (document.hidden) return;

      if (activeLesson.videoSourceType === "storage") {
        const el = videoRef.current;
        if (!el || el.paused || el.ended) return;
        const currentPos = Math.floor(el.currentTime || 0);
        const delta = Math.max(0, Math.min(20, currentPos - lastReportedPosRef.current || 15));
        lastReportedPosRef.current = currentPos;
        try {
          const res = await recordLessonProgressSecure({
            lessonId: activeLesson.id,
            positionSeconds: currentPos,
            deltaSeconds: delta,
            markComplete: false,
          });
          setLessonProgress(prev => {
            const others = prev.filter(p => p.lessonId !== activeLesson.id);
            return [...others, res.lessonProgress];
          });
          if (res.enrollment) setEnrollment(res.enrollment);
          if (res.certificate) setCertificate(res.certificate);
        } catch (err) {
          console.error(err);
        }
      } else if (activeLesson.videoSourceType === "external") {
        try {
          const res = await recordLessonProgressSecure({
            lessonId: activeLesson.id,
            positionSeconds: (activeLessonProgress?.lastPositionSeconds ?? 0) + 15,
            deltaSeconds: 15,
            markComplete: false,
          });
          setLessonProgress(prev => {
            const others = prev.filter(p => p.lessonId !== activeLesson.id);
            return [...others, res.lessonProgress];
          });
          if (res.enrollment) setEnrollment(res.enrollment);
          if (res.certificate) setCertificate(res.certificate);
        } catch (err) {
          console.error(err);
        }
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [activeLesson?.id, activeLesson?.lessonType, activeLesson?.videoSourceType, enrollment?.status]);

  useEffect(() => {
    if (!activeAttempt || !activeAttempt.expiresAt || activeAttempt.status !== "in_progress") {
      setSecondsRemaining(null);
      return;
    }

    const tick = () => {
      const rem = Math.max(
        0,
        Math.floor((new Date(activeAttempt.expiresAt as string).getTime() - Date.now()) / 1000)
      );
      setSecondsRemaining(rem);
      if (rem === 0) {
        handleSubmitQuiz(true);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeAttempt?.id, activeAttempt?.expiresAt, activeAttempt?.status]);

  async function handleSelfEnroll(prog: SpecialProgram) {
    try {
      setBusy(true);
      const enr = await manageProgramEnrollment(prog.id, "enroll");
      await refreshCatalogue();
      if (enr.status === "active") {
        await openWorkspace(prog.id);
      } else {
        alert("Enrollment request submitted and is awaiting administrator approval.");
      }
    } catch (err: any) {
      alert(err?.message || "Could not enroll in program.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkLessonComplete() {
    if (!activeLesson) return;
    try {
      setBusy(true);
      const res = await recordLessonProgressSecure({
        lessonId: activeLesson.id,
        positionSeconds: activeLesson.durationSeconds || 0,
        deltaSeconds: 15,
        markComplete: true,
      });
      setLessonProgress(prev => {
        const others = prev.filter(p => p.lessonId !== activeLesson.id);
        return [...others, res.lessonProgress];
      });
      if (res.enrollment) setEnrollment(res.enrollment);
      if (res.certificate) {
        setCertificate(res.certificate);
        setShowCertificateCard(true);
      }
    } catch (err: any) {
      alert(err?.message || "Could not mark lesson completed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBookmark() {
    if (!activeLesson) return;
    try {
      setBusy(true);
      await toggleLessonBookmark(activeLesson.id);
      if (program) {
        const ws = await loadStudentProgramWorkspace(program.id);
        setBookmarks(ws.bookmarks);
      }
    } catch (err: any) {
      alert(err?.message || "Could not update bookmark.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartQuiz(quiz: ProgramQuiz) {
    try {
      setBusy(true);
      setQuizResultBanner("");
      const attempt = await startProgramQuizAttempt(quiz.id);
      const opts = await getProgramQuizOptionsSafe(attempt.id);
      setActiveAttempt(attempt);
      setAttemptOptions(opts);
      setSelectedAnswers({});
    } catch (err: any) {
      alert(err?.message || "Could not start quiz attempt.");
    } finally {
      setBusy(false);
    }
  }

  function handleSelectOption(
    questionId: string,
    optionId: string,
    qType: "single_choice" | "multiple_choice" | "true_false"
  ) {
    setSelectedAnswers(prev => {
      const current = prev[questionId] ?? [];
      if (qType === "multiple_choice") {
        const exists = current.includes(optionId);
        return {
          ...prev,
          [questionId]: exists ? current.filter(id => id !== optionId) : [...current, optionId],
        };
      }
      return {
        ...prev,
        [questionId]: [optionId],
      };
    });
  }

  async function handleSubmitQuiz(isAuto = false) {
    if (!activeAttempt || !program) return;
    if (!isAuto && !window.confirm("Submit your quiz answers now?")) return;
    try {
      setBusy(true);
      const res = await submitProgramQuizAttempt(activeAttempt.id, selectedAnswers);
      setActiveAttempt(null);
      setAttemptOptions([]);
      if (res.enrollment) setEnrollment(res.enrollment);
      if (res.certificate) {
        setCertificate(res.certificate);
        setShowCertificateCard(true);
      }
      if (res.attempt.scorePercent != null) {
        setQuizResultBanner(
          `Quiz Submitted — Score: ${res.attempt.scorePercent}% (${
            res.attempt.passed ? "PASSED" : "NOT PASSED"
          })`
        );
      } else {
        setQuizResultBanner("Quiz Submitted — Your responses have been recorded.");
      }
      const ws = await loadStudentProgramWorkspace(program.id);
      setAttempts(ws.attempts);
    } catch (err: any) {
      alert(err?.message || "Could not submit quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePostDiscussion(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !selectedCourseId || !discussionBody.trim()) return;
    try {
      setBusy(true);
      await postProgramDiscussion({
        programId: program.id,
        courseId: selectedCourseId,
        lessonId: activeLesson?.id ?? null,
        body: discussionBody,
      });
      setDiscussionBody("");
      const ws = await loadStudentProgramWorkspace(program.id);
      setDiscussions(ws.discussions);
    } catch (err: any) {
      alert(err?.message || "Could not post message.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenResource(res: ProgramResource) {
    try {
      if (res.storagePath) {
        const url = await createSpecialProgramSignedUrl(res.storagePath, 1800);
        window.open(url, "_blank", "noopener,noreferrer");
      } else if (res.externalUrl) {
        window.open(res.externalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      alert(err?.message || "Could not open resource.");
    }
  }

  if (!activeProgramId) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <PageHeader
          title="Special Programs"
          sub="Explore structured self-paced academy tracks, complete video lessons and assessments, and earn verified certificates."
        />

        {myCertificates.length > 0 && (
          <Card>
            <h3 style={{ margin: "0 0 10px", color: C.text }}>My Earned Program Certificates</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {myCertificates.map(cert => (
                <div key={cert.id} style={rowBox}>
                  <div>
                    <div style={{ fontWeight: 800, color: C.text }}>{cert.programTitle}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      Certificate No: <strong>{cert.certificateNo}</strong> • Verification Token:{" "}
                      <strong>{cert.verificationToken}</strong> • Status:{" "}
                      <strong>{cert.status.toUpperCase()}</strong>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await openWorkspace(cert.programId);
                      setShowCertificateCard(true);
                    }}
                  >
                    View / Print Certificate
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loadingCatalogue ? (
          <Card>Loading Special Programs...</Card>
        ) : catalogue.length === 0 ? (
          <Card>
            <p style={{ margin: 0, color: C.muted }}>
              No Special Programs are currently available.
            </p>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {catalogue.map(prog => {
              const enr = myEnrollments.find(e => e.programId === prog.id);
              const progCoursesCount = allCourses.filter(c => c.programId === prog.id).length;
              const levelEligible =
                !prog.eligibleLevelIds ||
                prog.eligibleLevelIds.length === 0 ||
                (user.levelId && prog.eligibleLevelIds.includes(user.levelId));

              return (
                <Card key={prog.id}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={pill}>{prog.category.toUpperCase()}</span>
                      <span style={pill}>{prog.status.replace("_", " ").toUpperCase()}</span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: 19, color: C.text }}>{prog.title}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.55 }}>
                      {prog.description || "Structured self-paced special program."}
                    </p>

                    <div style={{ fontSize: 12, color: C.muted }}>
                      Courses: <strong>{progCoursesCount}</strong> •{" "}
                      {prog.isSelfPaced ? "Self-Paced" : "Scheduled"}
                      {prog.certificateEnabled ? " • Certificate Included" : ""}
                    </div>

                    {enr ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                          Enrollment: {enr.status.toUpperCase()} • Progress: {enr.progressPercent}%
                        </div>
                        <div style={progressTrack}>
                          <div
                            style={{
                              ...progressFill,
                              width: `${Math.min(100, Math.max(0, enr.progressPercent))}%`,
                            }}
                          />
                        </div>
                        {(enr.status === "active" || enr.status === "completed") && (
                          <Button onClick={() => openWorkspace(prog.id)}>
                            {enr.status === "completed"
                              ? "Review Program & Certificate"
                              : enr.progressPercent > 0
                                ? "Resume Learning"
                                : "Start Learning"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        {!levelEligible ? (
                          <div style={{ fontSize: 12, color: C.danger, fontWeight: 700 }}>
                            Restricted to specific academic levels.
                          </div>
                        ) : prog.enrollmentMode === "admin_only" ? (
                          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>
                            Enrollment assigned by Main Admin.
                          </div>
                        ) : prog.status === "enrollment_open" ? (
                          <Button disabled={busy} onClick={() => handleSelfEnroll(prog)}>
                            {prog.enrollmentMode === "approval_required"
                              ? "Request Enrollment"
                              : "Enroll Now"}
                          </Button>
                        ) : (
                          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>
                            Enrollment is currently closed.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const courseLessons = lessons.filter(l => l.courseId === selectedCourseId);
  const courseSections = sections.filter(s => s.courseId === selectedCourseId);
  const courseQuizzes = quizzes.filter(q => q.courseId === selectedCourseId);
  const lessonResources = resources.filter(
    r =>
      r.courseId === selectedCourseId &&
      (!r.lessonId || (activeLesson && r.lessonId === activeLesson.id))
  );
  const isLessonBookmarked = activeLesson
    ? bookmarks.some(b => b.lessonId === activeLesson.id)
    : false;
  const courseDiscussions = discussions.filter(d => d.courseId === selectedCourseId);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title={program?.title || "Program Workspace"}
        sub={`Overall Progress: ${enrollment?.progressPercent ?? 0}% • Status: ${
          enrollment?.status?.toUpperCase() ?? "-"
        }`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {certificate && (
              <Button
                variant="secondary"
                onClick={() => setShowCertificateCard(prev => !prev)}
              >
                {showCertificateCard ? "Hide Certificate" : "View Certificate"}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setActiveProgramId(null);
                refreshCatalogue();
              }}
            >
              All Special Programs
            </Button>
          </div>
        }
      />

      {workspaceLoading ? (
        <Card>Loading program lessons and progress...</Card>
      ) : (
        <>
          {certificate && showCertificateCard && (
            <Card>
              <div
                style={{
                  border: "3px double #166534",
                  borderRadius: 16,
                  padding: 28,
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#166534" }}>
                  INTIZARUL IMAMUL MUNTAZAR ACADEMY • SPECIAL PROGRAMS
                </div>
                <h2 style={{ margin: "10px 0 6px", fontSize: 28, color: C.text }}>
                  Certificate of Completion
                </h2>
                <p style={{ margin: "0 0 14px", color: C.muted }}>This certifies that</p>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text }}>
                  {certificate.studentName}
                </div>
                {certificate.regNo && (
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                    Registration No: {certificate.regNo}
                  </div>
                )}
                <p style={{ margin: "14px 0 8px", color: C.muted }}>
                  has successfully fulfilled all required coursework and assessments for
                </p>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#166534" }}>
                  {certificate.programTitle}
                </div>
                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    justifyContent: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    fontSize: 12,
                    color: C.text,
                  }}
                >
                  <span>
                    Certificate No: <strong>{certificate.certificateNo}</strong>
                  </span>
                  <span>
                    Verification Token: <strong>{certificate.verificationToken}</strong>
                  </span>
                  <span>
                    Issued: <strong>{new Date(certificate.issuedAt).toLocaleDateString()}</strong>
                  </span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <Button onClick={() => window.print()}>Print / Save PDF</Button>
                </div>
              </div>
            </Card>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(270px, 340px) minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <Card>
              <h3 style={{ margin: "0 0 12px", color: C.text }}>Program Curriculum</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {courses.map(c => {
                  const unlocked = unlockedCourseIds.has(c.id);
                  const completed = completedCourseIds.has(c.id);
                  const isCurrentCourse = c.id === selectedCourseId;
                  return (
                    <div
                      key={c.id}
                      style={{
                        border: "1px solid " + (isCurrentCourse ? C.primary : C.border),
                        borderRadius: 12,
                        padding: 12,
                        background: unlocked ? "#fff" : "#f1f5f9",
                        opacity: unlocked ? 1 : 0.72,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: C.text,
                          cursor: unlocked ? "pointer" : "not-allowed",
                        }}
                        onClick={() => {
                          if (!unlocked) return;
                          setSelectedCourseId(c.id);
                        }}
                      >
                        {c.title} {completed ? "✓" : !unlocked ? "(Locked)" : ""}
                      </div>
                      {!unlocked && (
                        <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>
                          Complete prerequisite course(s) first to unlock.
                        </div>
                      )}

                      {unlocked && isCurrentCourse && (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {courseSections.map(sec => {
                            const secLessons = courseLessons.filter(l => l.sectionId === sec.id);
                            return (
                              <div key={sec.id}>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: C.muted,
                                    marginBottom: 4,
                                  }}
                                >
                                  {sec.title}
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {secLessons.map(les => {
                                    const done = lessonProgress.some(
                                      lp => lp.lessonId === les.id && lp.status === "completed"
                                    );
                                    const active = selectedLessonId === les.id && !selectedQuizId;
                                    return (
                                      <button
                                        key={les.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedLessonId(les.id);
                                          setSelectedQuizId("");
                                          setActiveAttempt(null);
                                        }}
                                        style={{
                                          textAlign: "left",
                                          padding: "8px 10px",
                                          borderRadius: 8,
                                          border: "1px solid " + (active ? C.primary : C.border),
                                          background: active ? "#eff6ff" : "#f8fafc",
                                          color: C.text,
                                          fontWeight: active ? 800 : 600,
                                          fontSize: 13,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {done ? "✓ " : "○ "}
                                        {les.title}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {courseQuizzes.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: C.muted,
                                  marginBottom: 4,
                                }}
                              >
                                Course Assessments
                              </div>
                              <div style={{ display: "grid", gap: 4 }}>
                                {courseQuizzes.map(qz => {
                                  const passed = attempts.some(
                                    a => a.quizId === qz.id && a.status === "submitted" && a.passed
                                  );
                                  const active = selectedQuizId === qz.id;
                                  return (
                                    <button
                                      key={qz.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedQuizId(qz.id);
                                        setActiveAttempt(null);
                                        setQuizResultBanner("");
                                      }}
                                      style={{
                                        textAlign: "left",
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        border: "1px solid " + (active ? C.primary : C.border),
                                        background: active ? "#fef3c7" : "#fffbeb",
                                        color: C.text,
                                        fontWeight: 800,
                                        fontSize: 13,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {passed ? "✓ " : "★ "}
                                      Quiz: {qz.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div style={{ display: "grid", gap: 16 }}>
              {activeQuiz ? (
                <Card>
                  <h2 style={{ margin: "0 0 6px", color: C.text }}>{activeQuiz.title}</h2>
                  <p style={{ margin: "0 0 12px", color: C.muted }}>
                    {activeQuiz.description || "Complete all questions and submit your attempt."}
                  </p>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    <span style={pill}>Pass Mark: {activeQuiz.passMarkPercent}%</span>
                    <span style={pill}>Max Attempts: {activeQuiz.attemptsAllowed}</span>
                    {activeQuiz.timeLimitMinutes && (
                      <span style={pill}>Time Limit: {activeQuiz.timeLimitMinutes} mins</span>
                    )}
                  </div>

                  {quizResultBanner && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        color: "#166534",
                        fontWeight: 800,
                        marginBottom: 14,
                      }}
                    >
                      {quizResultBanner}
                    </div>
                  )}

                  {!activeAttempt ? (
                    <div style={{ display: "grid", gap: 12 }}>
                      <Button disabled={busy} onClick={() => handleStartQuiz(activeQuiz)}>
                        {busy ? "Preparing Quiz..." : "Start / Resume Quiz Attempt"}
                      </Button>

                      {attempts.filter(a => a.quizId === activeQuiz.id).length > 0 && (
                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                          <strong style={{ color: C.text }}>Previous Attempts</strong>
                          {attempts
                            .filter(a => a.quizId === activeQuiz.id)
                            .map(att => (
                              <div key={att.id} style={rowBox}>
                                <div style={{ fontSize: 13 }}>
                                  Attempt #{att.attemptNumber} • Status:{" "}
                                  <strong>{att.status.toUpperCase()}</strong>
                                  {att.scorePercent != null
                                    ? ` • Score: ${att.scorePercent}% (${
                                        att.passed ? "PASSED" : "FAILED"
                                      })`
                                    : ""}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                      {secondsRemaining != null && (
                        <div
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#991b1b",
                            fontWeight: 800,
                          }}
                        >
                          Time Remaining: {Math.floor(secondsRemaining / 60)}:
                          {String(secondsRemaining % 60).padStart(2, "0")}
                        </div>
                      )}

                      {questions
                        .filter(q => q.quizId === activeQuiz.id)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((q, idx) => {
                          const qOpts = attemptOptions
                            .filter(o => o.questionId === q.id)
                            .sort((a, b) => a.displayOrder - b.displayOrder);
                          const chosen = selectedAnswers[q.id] ?? [];

                          return (
                            <div
                              key={q.id}
                              style={{
                                padding: 14,
                                border: "1px solid " + C.border,
                                borderRadius: 12,
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ fontWeight: 800, color: C.text, marginBottom: 8 }}>
                                {idx + 1}. {q.questionText} ({q.points} pt{q.points === 1 ? "" : "s"})
                              </div>
                              <div style={{ display: "grid", gap: 8 }}>
                                {qOpts.map(opt => {
                                  const checked = chosen.includes(opt.id);
                                  return (
                                    <label
                                      key={opt.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        border: "1px solid " + (checked ? C.primary : C.border),
                                        background: checked ? "#eff6ff" : "#fff",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type={
                                          q.questionType === "multiple_choice" ? "checkbox" : "radio"
                                        }
                                        name={`attempt_q_${q.id}`}
                                        checked={checked}
                                        onChange={() =>
                                          handleSelectOption(q.id, opt.id, q.questionType)
                                        }
                                      />
                                      <span>{opt.optionText}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                      <div>
                        <Button disabled={busy} onClick={() => handleSubmitQuiz(false)}>
                          {busy ? "Submitting..." : "Submit Quiz Answers"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ) : activeLesson ? (
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, color: C.text }}>{activeLesson.title}</h2>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        Format: {activeLesson.lessonType.toUpperCase()} • Status:{" "}
                        <strong>
                          {activeLessonProgress?.status === "completed"
                            ? "COMPLETED"
                            : `${activeLessonProgress?.progressPercent ?? 0}% IN PROGRESS`}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" disabled={busy} onClick={handleToggleBookmark}>
                        {isLessonBookmarked ? "★ Bookmarked" : "☆ Bookmark"}
                      </Button>
                      {activeLessonProgress?.status !== "completed" && (
                        <Button disabled={busy} onClick={handleMarkLessonComplete}>
                          {busy ? "Updating..." : "Mark Completed"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {activeLesson.description && (
                    <p style={{ color: C.muted, marginTop: 0 }}>{activeLesson.description}</p>
                  )}

                  {activeLesson.lessonType === "video" &&
                    activeLesson.videoSourceType === "storage" && (
                      <div style={{ margin: "12px 0" }}>
                        {signedMediaUrl ? (
                          <video
                            ref={videoRef}
                            src={signedMediaUrl}
                            controls
                            style={{ width: "100%", borderRadius: 12, background: "#000" }}
                            onLoadedMetadata={() => {
                              if (
                                videoRef.current &&
                                activeLessonProgress?.lastPositionSeconds &&
                                activeLessonProgress.lastPositionSeconds > 0
                              ) {
                                videoRef.current.currentTime =
                                  activeLessonProgress.lastPositionSeconds;
                              }
                            }}
                            onEnded={async () => {
                              const pos = Math.floor(
                                videoRef.current?.duration || activeLesson.durationSeconds || 0
                              );
                              const res = await recordLessonProgressSecure({
                                lessonId: activeLesson.id,
                                positionSeconds: pos,
                                deltaSeconds: 20,
                                markComplete: true,
                              });
                              setLessonProgress(prev => [
                                ...prev.filter(p => p.lessonId !== activeLesson.id),
                                res.lessonProgress,
                              ]);
                              if (res.enrollment) setEnrollment(res.enrollment);
                              if (res.certificate) setCertificate(res.certificate);
                            }}
                          />
                        ) : (
                          <div style={{ color: C.muted }}>Loading video stream...</div>
                        )}
                      </div>
                    )}

                  {activeLesson.lessonType === "video" &&
                    activeLesson.videoSourceType === "external" &&
                    activeLesson.externalUrl && (
                      <div style={{ margin: "12px 0", display: "grid", gap: 10 }}>
                        {toEmbedVideoUrl(activeLesson.externalUrl) ? (
                          <iframe
                            src={toEmbedVideoUrl(activeLesson.externalUrl) as string}
                            title={activeLesson.title}
                            style={{
                              width: "100%",
                              height: 420,
                              border: "none",
                              borderRadius: 12,
                            }}
                            allowFullScreen
                          />
                        ) : null}
                        <div>
                          <a
                            href={activeLesson.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: C.primary, fontWeight: 700 }}
                          >
                            Open External Video Link ↗
                          </a>
                        </div>
                      </div>
                    )}

                  {(activeLesson.lessonType === "pdf" ||
                    activeLesson.lessonType === "presentation" ||
                    activeLesson.lessonType === "document") && (
                    <div style={{ margin: "12px 0", display: "grid", gap: 10 }}>
                      {(signedMediaUrl || activeLesson.externalUrl) && (
                        <>
                          <iframe
                            src={signedMediaUrl || (activeLesson.externalUrl as string)}
                            title={activeLesson.title}
                            style={{
                              width: "100%",
                              height: 520,
                              border: "1px solid " + C.border,
                              borderRadius: 12,
                            }}
                          />
                          <div>
                            <a
                              href={signedMediaUrl || (activeLesson.externalUrl as string)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: C.primary, fontWeight: 700 }}
                            >
                              Open Document in New Tab ↗
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeLesson.lessonType === "external_link" && activeLesson.externalUrl && (
                    <div style={{ margin: "12px 0" }}>
                      <a
                        href={activeLesson.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: C.primary, fontWeight: 800, fontSize: 15 }}
                      >
                        Launch External Study Resource ↗
                      </a>
                    </div>
                  )}

                  {activeLesson.contentBody && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 16,
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid " + C.border,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.7,
                        color: C.text,
                      }}
                    >
                      {activeLesson.contentBody}
                    </div>
                  )}

                  {lessonResources.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h4 style={{ margin: "0 0 8px", color: C.text }}>
                        Downloadable Study Resources
                      </h4>
                      <div style={{ display: "grid", gap: 8 }}>
                        {lessonResources.map(res => (
                          <div key={res.id} style={rowBox}>
                            <div style={{ fontWeight: 700, color: C.text }}>{res.title}</div>
                            <Button variant="secondary" onClick={() => handleOpenResource(res)}>
                              Open / Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <Card>
                  <p style={{ margin: 0, color: C.muted }}>
                    Select a lesson or quiz from the curriculum menu to begin.
                  </p>
                </Card>
              )}

              {selectedCourseId && (
                <Card>
                  <h3 style={{ margin: "0 0 12px", color: C.text }}>Course Q&A Discussion</h3>
                  <form
                    onSubmit={handlePostDiscussion}
                    style={{ display: "flex", gap: 10, marginBottom: 14 }}
                  >
                    <div style={{ flex: 1 }}>
                      <Input
                        value={discussionBody}
                        onChange={setDiscussionBody}
                        placeholder="Ask a question or share a key takeaway with your cohort..."
                      />
                    </div>
                    <Button type="submit" disabled={busy || !discussionBody.trim()}>
                      Post
                    </Button>
                  </form>

                  {courseDiscussions.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: 13 }}>
                      No discussion messages in this course yet.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {courseDiscussions.map(msg => {
                        const author = memberProfiles[msg.authorId];
                        return (
                          <div key={msg.id} style={rowBox}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>
                                {author?.name || "Participant"} •{" "}
                                <span style={{ color: C.muted, fontWeight: 500 }}>
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div style={{ marginTop: 4, color: C.text }}>{msg.body}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const pill: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  border: "1px solid " + C.border,
  fontSize: 11,
  fontWeight: 800,
  color: C.text,
};

const progressTrack: CSSProperties = {
  width: "100%",
  height: 8,
  borderRadius: 999,
  background: "#e2e8f0",
  overflow: "hidden",
};

const progressFill: CSSProperties = {
  height: "100%",
  background: C.primary,
};

const rowBox: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: 12,
  border: "1px solid " + C.border,
  borderRadius: 12,
  background: "#f8fafc",
};