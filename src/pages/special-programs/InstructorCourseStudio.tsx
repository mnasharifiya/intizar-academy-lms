import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button, Card, Input, PageHeader } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import {
  createSpecialProgramSignedUrl,
  deleteProgramLesson,
  deleteProgramQuiz,
  deleteProgramResource,
  deleteProgramSection,
  loadCourseStudioBundle,
  saveProgramLesson,
  saveProgramQuizAtomic,
  saveProgramResource,
  saveProgramSection,
  spIsoToWatInput,
  updateProgramCourse,
  uploadSpecialProgramAsset,
  type LessonProgressRecord,
  type ProgramCourse,
  type ProgramEnrollment,
  type ProgramLesson,
  type ProgramQuiz,
  type ProgramQuizAttempt,
  type ProgramQuizOption,
  type ProgramQuizQuestion,
  type ProgramResource,
  type ProgramSection,
  type SpecialProgramLessonType,
  type SpecialProgramQuizQuestionType,
  type SpecialProgramVideoSourceType,
} from "../../lib/specialProgramsApi";

interface DraftOption {
  optionText: string;
  isCorrect: boolean;
}

interface DraftQuestion {
  questionType: SpecialProgramQuizQuestionType;
  questionText: string;
  explanation: string;
  points: string;
  options: DraftOption[];
}

function emptyQuestion(): DraftQuestion {
  return {
    questionType: "single_choice",
    questionText: "",
    explanation: "",
    points: "1",
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

export default function InstructorCourseStudio({
  user: _user,
  data,
  availableCourses,
  initialCourseId,
  onBack,
}: {
  user: any;
  data: any;
  availableCourses: ProgramCourse[];
  initialCourseId?: string;
  onBack?: () => void;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || availableCourses[0]?.id || ""
  );
  const [course, setCourse] = useState<ProgramCourse | null>(null);
  const [sections, setSections] = useState<ProgramSection[]>([]);
  const [lessons, setLessons] = useState<ProgramLesson[]>([]);
  const [resources, setResources] = useState<ProgramResource[]>([]);
  const [quizzes, setQuizzes] = useState<ProgramQuiz[]>([]);
  const [questions, setQuestions] = useState<ProgramQuizQuestion[]>([]);
  const [options, setOptions] = useState<ProgramQuizOption[]>([]);
  const [attempts, setAttempts] = useState<ProgramQuizAttempt[]>([]);
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRecord[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});

  const [tab, setTab] = useState<"curriculum" | "resources" | "quizzes" | "learners">("curriculum");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [secTitle, setSecTitle] = useState("");
  const [secDesc, setSecDesc] = useState("");
  const [secOrder, setSecOrder] = useState("1");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lesSectionId, setLesSectionId] = useState("");
  const [lesTitle, setLesTitle] = useState("");
  const [lesDesc, setLesDesc] = useState("");
  const [lesType, setLesType] = useState<SpecialProgramLessonType>("video");
  const [lesVideoMode, setLesVideoMode] = useState<SpecialProgramVideoSourceType>("storage");
  const [lesContentBody, setLesContentBody] = useState("");
  const [lesExternalUrl, setLesExternalUrl] = useState("");
  const [lesMediaPath, setLesMediaPath] = useState<string | null>(null);
  const [lesFile, setLesFile] = useState<File | null>(null);
  const [lesDurationSec, setLesDurationSec] = useState("300");
  const [lesMinWatch, setLesMinWatch] = useState("85");
  const [lesRequired, setLesRequired] = useState(true);
  const [lesPublished, setLesPublished] = useState(true);
  const [lesOrder, setLesOrder] = useState("1");

  const [resTitle, setResTitle] = useState("");
  const [resLessonId, setResLessonId] = useState("");
  const [resExternalUrl, setResExternalUrl] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);
  const [resDownloadable, setResDownloadable] = useState(true);

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [qTitle, setQTitle] = useState("");
  const [qDescription, setQDescription] = useState("");
  const [qSectionId, setQSectionId] = useState("");
  const [qPassMark, setQPassMark] = useState("70");
  const [qAttemptsAllowed, setQAttemptsAllowed] = useState("2");
  const [qTimeLimit, setQTimeLimit] = useState("20");
  const [qRequired, setQRequired] = useState(true);
  const [qPublished, setQPublished] = useState(true);
  const [qShowResult, setQShowResult] = useState(true);
  const [qDeadline, setQDeadline] = useState("");
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (!selectedCourseId && availableCourses.length > 0) {
      setSelectedCourseId(availableCourses[0].id);
    }
  }, [initialCourseId, availableCourses]);

  async function refreshStudio(targetCourseId: string) {
    if (!targetCourseId) return;
    try {
      setLoading(true);
      const bundle = await loadCourseStudioBundle(targetCourseId);
      setCourse(bundle.course);
      setSections(bundle.sections);
      setLessons(bundle.lessons);
      setResources(bundle.resources);
      setQuizzes(bundle.quizzes);
      setQuestions(bundle.questions);
      setOptions(bundle.options);
      setAttempts(bundle.attempts);
      setEnrollments(bundle.enrollments);
      setLessonProgress(bundle.lessonProgress);

      if (bundle.sections.length > 0 && !lesSectionId) {
        setLesSectionId(bundle.sections[0].id);
      }

      const profilesRes = await (supabase as any).rpc("get_program_member_profiles", {
        p_program_id: bundle.course.programId,
      });
      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        const nextMap: Record<string, any> = {};
        profilesRes.data.forEach((p: any) => {
          nextMap[p.id] = p;
        });
        setMemberProfiles(nextMap);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to load course studio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedCourseId) {
      refreshStudio(selectedCourseId);
    }
  }, [selectedCourseId]);

  const usersMap = useMemo(() => {
    const map: Record<string, any> = { ...memberProfiles };
    (data?.users ?? []).forEach((u: any) => {
      map[u.id] = u;
    });
    return map;
  }, [data?.users, memberProfiles]);

  async function handleToggleCoursePublish() {
    if (!course) return;
    const nextStatus = course.status === "published" ? "draft" : "published";
    try {
      setBusy(true);
      await updateProgramCourse(course.id, { status: nextStatus });
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not update course status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !secTitle.trim()) return;
    try {
      setBusy(true);
      const created = await saveProgramSection({
        courseId: course.id,
        title: secTitle,
        description: secDesc,
        displayOrder: Number(secOrder || sections.length + 1),
      });
      setSecTitle("");
      setSecDesc("");
      setSecOrder(String(sections.length + 2));
      setLesSectionId(created.id);
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not create section.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSection(section: ProgramSection) {
    if (!course) return;
    if (!window.confirm(`Delete section "${section.title}" and all lessons inside it?`)) return;
    try {
      setBusy(true);
      await deleteProgramSection(section.id);
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not delete section.");
    } finally {
      setBusy(false);
    }
  }

  function resetLessonForm() {
    setEditingLessonId(null);
    setLesTitle("");
    setLesDesc("");
    setLesType("video");
    setLesVideoMode("storage");
    setLesContentBody("");
    setLesExternalUrl("");
    setLesMediaPath(null);
    setLesFile(null);
    setLesDurationSec("300");
    setLesMinWatch("85");
    setLesRequired(true);
    setLesPublished(true);
    setLesOrder(String(lessons.length + 1));
  }

  function startEditLesson(lesson: ProgramLesson) {
    setEditingLessonId(lesson.id);
    setLesSectionId(lesson.sectionId);
    setLesTitle(lesson.title);
    setLesDesc(lesson.description ?? "");
    setLesType(lesson.lessonType);
    setLesVideoMode(lesson.videoSourceType ?? "storage");
    setLesContentBody(lesson.contentBody ?? "");
    setLesExternalUrl(lesson.externalUrl ?? "");
    setLesMediaPath(lesson.mediaStoragePath);
    setLesFile(null);
    setLesDurationSec(String(lesson.durationSeconds || 300));
    setLesMinWatch(String(lesson.minWatchPercent || 85));
    setLesRequired(lesson.isRequired);
    setLesPublished(lesson.isPublished);
    setLesOrder(String(lesson.displayOrder || 1));
  }

  async function handleSaveLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    if (!lesSectionId) {
      alert("Create or select a course section first.");
      return;
    }
    if (!lesTitle.trim()) {
      alert("Lesson title is required.");
      return;
    }

    try {
      setBusy(true);
      let uploadedPath = lesMediaPath;
      if (lesFile) {
        uploadedPath = await uploadSpecialProgramAsset({
          programId: course.programId,
          courseId: course.id,
          lessonId: editingLessonId ?? undefined,
          file: lesFile,
        });
      }

      if (lesType === "video") {
        if (lesVideoMode === "storage" && !uploadedPath) {
          throw new Error("Upload a video file or switch Video Source to External Link.");
        }
        if (lesVideoMode === "external" && !lesExternalUrl.trim()) {
          throw new Error("Provide an external video URL (YouTube, Vimeo, or direct MP4).");
        }
      }

      if (
        (lesType === "pdf" || lesType === "presentation" || lesType === "document") &&
        !uploadedPath &&
        !lesExternalUrl.trim()
      ) {
        throw new Error("Upload a document/presentation file or provide an external URL.");
      }

      if (lesType === "external_link" && !lesExternalUrl.trim()) {
        throw new Error("External link URL is required.");
      }

      if (lesType === "text" && !lesContentBody.trim()) {
        throw new Error("Reading content body is required for a text lesson.");
      }

      await saveProgramLesson({
        id: editingLessonId ?? undefined,
        sectionId: lesSectionId,
        courseId: course.id,
        title: lesTitle,
        description: lesDesc,
        lessonType: lesType,
        videoSourceType: lesType === "video" ? lesVideoMode : null,
        contentBody: lesType === "text" ? lesContentBody : lesContentBody || null,
        mediaStoragePath: uploadedPath,
        externalUrl: lesExternalUrl || null,
        durationSeconds: Number(lesDurationSec || 0),
        minWatchPercent: Number(lesMinWatch || 85),
        isRequired: lesRequired,
        isPublished: lesPublished,
        displayOrder: Number(lesOrder || 1),
      });

      resetLessonForm();
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Failed to save lesson.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLesson(lesson: ProgramLesson) {
    if (!course) return;
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      setBusy(true);
      await deleteProgramLesson(lesson.id);
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not delete lesson.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveResource(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !resTitle.trim()) return;
    try {
      setBusy(true);
      let storagePath: string | null = null;
      let fileType = "link";
      let fileSizeBytes: number | null = null;

      if (resFile) {
        storagePath = await uploadSpecialProgramAsset({
          programId: course.programId,
          courseId: course.id,
          lessonId: resLessonId || undefined,
          file: resFile,
        });
        fileType = resFile.type || resFile.name.split(".").pop() || "file";
        fileSizeBytes = resFile.size;
      } else if (!resExternalUrl.trim()) {
        throw new Error("Select a file to upload or enter an external resource URL.");
      }

      await saveProgramResource({
        programId: course.programId,
        courseId: course.id,
        lessonId: resLessonId || null,
        title: resTitle,
        fileType,
        storagePath,
        externalUrl: resExternalUrl || null,
        fileSizeBytes,
        isDownloadable: resDownloadable,
      });

      setResTitle("");
      setResLessonId("");
      setResExternalUrl("");
      setResFile(null);
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not save resource.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePreviewResource(res: ProgramResource) {
    try {
      if (res.storagePath) {
        const signed = await createSpecialProgramSignedUrl(res.storagePath, 1800);
        window.open(signed, "_blank", "noopener,noreferrer");
      } else if (res.externalUrl) {
        window.open(res.externalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      alert(err?.message || "Could not open resource.");
    }
  }

  function resetQuizBuilder() {
    setEditingQuizId(null);
    setQTitle("");
    setQDescription("");
    setQSectionId("");
    setQPassMark("70");
    setQAttemptsAllowed("2");
    setQTimeLimit("20");
    setQRequired(true);
    setQPublished(true);
    setQShowResult(true);
    setQDeadline("");
    setDraftQuestions([emptyQuestion()]);
  }

  function loadQuizIntoBuilder(quiz: ProgramQuiz) {
    setEditingQuizId(quiz.id);
    setQTitle(quiz.title);
    setQDescription(quiz.description ?? "");
    setQSectionId(quiz.sectionId ?? "");
    setQPassMark(String(quiz.passMarkPercent));
    setQAttemptsAllowed(String(quiz.attemptsAllowed));
    setQTimeLimit(quiz.timeLimitMinutes != null ? String(quiz.timeLimitMinutes) : "");
    setQRequired(quiz.isRequired);
    setQPublished(quiz.isPublished);
    setQShowResult(quiz.showResultImmediately);
    setQDeadline(spIsoToWatInput(quiz.deadlineAt));

    const qList = questions
      .filter(q => q.quizId === quiz.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (qList.length > 0) {
      setDraftQuestions(
        qList.map(q => ({
          questionType: q.questionType,
          questionText: q.questionText,
          explanation: q.explanation ?? "",
          points: String(q.points),
          options: options
            .filter(o => o.questionId === q.id)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(o => ({
              optionText: o.optionText,
              isCorrect: Boolean(o.isCorrect),
            })),
        }))
      );
    } else {
      setDraftQuestions([emptyQuestion()]);
    }
  }

  function updateDraftQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setDraftQuestions(prev =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const next = { ...q, ...patch };
        if (patch.questionType === "true_false") {
          next.options = [
            { optionText: "True", isCorrect: true },
            { optionText: "False", isCorrect: false },
          ];
        }
        return next;
      })
    );
  }

  function toggleOptionCorrect(qIdx: number, optIdx: number) {
    setDraftQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextOpts = q.options.map((opt, oI) => {
          if (q.questionType === "multiple_choice") {
            return oI === optIdx ? { ...opt, isCorrect: !opt.isCorrect } : opt;
          }
          return { ...opt, isCorrect: oI === optIdx };
        });
        return { ...q, options: nextOpts };
      })
    );
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    if (!qTitle.trim()) {
      alert("Quiz title is required.");
      return;
    }

    const existingAttemptsCount = editingQuizId
      ? attempts.filter(a => a.quizId === editingQuizId).length
      : 0;

    try {
      setBusy(true);
      await saveProgramQuizAtomic(
        {
          id: editingQuizId ?? undefined,
          courseId: course.id,
          sectionId: qSectionId || null,
          title: qTitle,
          description: qDescription,
          passMarkPercent: Number(qPassMark || 70),
          attemptsAllowed: Number(qAttemptsAllowed || 1),
          timeLimitMinutes: qTimeLimit ? Number(qTimeLimit) : null,
          isRequired: qRequired,
          isPublished: qPublished,
          showResultImmediately: qShowResult,
          deadlineAt: qDeadline || null,
          displayOrder: quizzes.length + 1,
          settingsOnly: existingAttemptsCount > 0,
        },
        draftQuestions.map(q => ({
          questionType: q.questionType,
          questionText: q.questionText,
          explanation: q.explanation,
          points: Number(q.points || 1),
          options: q.options.map(o => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        }))
      );

      resetQuizBuilder();
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not save quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteQuiz(quiz: ProgramQuiz) {
    if (!course) return;
    if (!window.confirm(`Delete quiz "${quiz.title}"?`)) return;
    try {
      setBusy(true);
      await deleteProgramQuiz(quiz.id);
      await refreshStudio(course.id);
    } catch (err: any) {
      alert(err?.message || "Could not delete quiz.");
    } finally {
      setBusy(false);
    }
  }

  if (availableCourses.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, color: C.muted }}>
          You have not been assigned to any Special Program courses yet.
        </p>
      </Card>
    );
  }

  const editingQuizHasAttempts = editingQuizId
    ? attempts.filter(a => a.quizId === editingQuizId).length > 0
    : false;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Course Instructor Studio"
        sub="Build structured sections, upload videos & study resources, create self-paced quizzes, and review student completion."
        action={
          onBack ? (
            <Button variant="secondary" onClick={onBack}>
              Back to Programs
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 280, flex: 1 }}>
            <label style={labelStyle}>Assigned Program Course</label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              style={selectStyle}
            >
              {availableCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} [{c.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {course && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={badgeStyle}>Course Status: {course.status.toUpperCase()}</span>
              <Button
                variant={course.status === "published" ? "secondary" : "primary"}
                disabled={busy}
                onClick={handleToggleCoursePublish}
              >
                {course.status === "published" ? "Unpublish Course" : "Publish Course"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            ["curriculum", `Sections & Lessons (${lessons.length})`],
            ["resources", `Resources (${resources.length})`],
            ["quizzes", `Quizzes & Assessments (${quizzes.length})`],
            ["learners", `Course Learners (${enrollments.length})`],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "secondary"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card>Loading course studio...</Card>
      ) : (
        <>
          {tab === "curriculum" && (
            <div style={{ display: "grid", gap: 16 }}>
              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>1. Add Course Section</h3>
                <form onSubmit={handleCreateSection} style={{ display: "grid", gap: 10 }}>
                  <div style={threeCol}>
                    <div>
                      <label style={labelStyle}>Section Title *</label>
                      <Input
                        value={secTitle}
                        onChange={setSecTitle}
                        placeholder="e.g. Week 1: Core Foundations"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Description</label>
                      <Input
                        value={secDesc}
                        onChange={setSecDesc}
                        placeholder="Optional section overview"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Order</label>
                      <Input type="number" value={secOrder} onChange={setSecOrder} />
                    </div>
                  </div>
                  <div>
                    <Button type="submit" disabled={busy || !secTitle.trim()}>
                      Add Section
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>
                  {editingLessonId ? "2. Edit Lesson" : "2. Add Lesson to Section"}
                </h3>
                <form onSubmit={handleSaveLesson} style={{ display: "grid", gap: 12 }}>
                  <div style={threeCol}>
                    <div>
                      <label style={labelStyle}>Section *</label>
                      <select
                        value={lesSectionId}
                        onChange={e => setLesSectionId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Select Section...</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>
                            #{s.displayOrder} — {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Lesson Title *</label>
                      <Input
                        value={lesTitle}
                        onChange={setLesTitle}
                        placeholder="e.g. Lesson 1.1: Strategic Decision Frameworks"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Lesson Format</label>
                      <select
                        value={lesType}
                        onChange={e => setLesType(e.target.value as SpecialProgramLessonType)}
                        style={selectStyle}
                      >
                        <option value="video">Video Lecture</option>
                        <option value="pdf">PDF Handout</option>
                        <option value="presentation">Presentation Slides (PPT/PDF)</option>
                        <option value="document">Study Document</option>
                        <option value="external_link">External Resource Link</option>
                        <option value="text">Text / Article Reading</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Lesson Summary</label>
                    <Input
                      value={lesDesc}
                      onChange={setLesDesc}
                      placeholder="Short summary shown to students"
                    />
                  </div>

                  {lesType === "video" && (
                    <div style={threeCol}>
                      <div>
                        <label style={labelStyle}>Video Source Mode</label>
                        <select
                          value={lesVideoMode}
                          onChange={e =>
                            setLesVideoMode(e.target.value as SpecialProgramVideoSourceType)
                          }
                          style={selectStyle}
                        >
                          <option value="storage">Upload Video File (Private Storage)</option>
                          <option value="external">External Video Link (YouTube / Vimeo / URL)</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Expected Video Duration (Seconds)</label>
                        <Input
                          type="number"
                          value={lesDurationSec}
                          onChange={setLesDurationSec}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Min Watch % to Complete</label>
                        <Input type="number" value={lesMinWatch} onChange={setLesMinWatch} />
                      </div>
                    </div>
                  )}

                  {((lesType === "video" && lesVideoMode === "storage") ||
                    lesType === "pdf" ||
                    lesType === "presentation" ||
                    lesType === "document") && (
                    <div>
                      <label style={labelStyle}>
                        Upload Media / File{" "}
                        {lesMediaPath ? `(Current file attached: ${lesMediaPath.split("/").pop()})` : ""}
                      </label>
                      <input
                        type="file"
                        onChange={e => setLesFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}

                  {((lesType === "video" && lesVideoMode === "external") ||
                    lesType === "external_link" ||
                    lesType === "pdf" ||
                    lesType === "presentation" ||
                    lesType === "document") && (
                    <div>
                      <label style={labelStyle}>
                        External URL {lesType === "external_link" || (lesType === "video" && lesVideoMode === "external") ? "*" : "(Optional fallback)"}
                      </label>
                      <Input
                        value={lesExternalUrl}
                        onChange={setLesExternalUrl}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>
                      {lesType === "text" ? "Lesson Reading Body *" : "Lesson Notes / Reading Text (Optional)"}
                    </label>
                    <textarea
                      value={lesContentBody}
                      onChange={e => setLesContentBody(e.target.value)}
                      rows={4}
                      style={textareaStyle}
                      placeholder="Write structured study notes, instructions, or full reading text..."
                    />
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ width: 120 }}>
                      <label style={labelStyle}>Order</label>
                      <Input type="number" value={lesOrder} onChange={setLesOrder} />
                    </div>
                    <label style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={lesRequired}
                        onChange={e => setLesRequired(e.target.checked)}
                      />
                      Required Lesson
                    </label>
                    <label style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={lesPublished}
                        onChange={e => setLesPublished(e.target.checked)}
                      />
                      Published to Students
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving..." : editingLessonId ? "Update Lesson" : "Save Lesson"}
                    </Button>
                    {editingLessonId && (
                      <Button variant="secondary" onClick={resetLessonForm}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              {sections.map(sec => {
                const secLessons = lessons
                  .filter(l => l.sectionId === sec.id)
                  .sort((a, b) => a.displayOrder - b.displayOrder);
                return (
                  <Card key={sec.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, color: C.text }}>
                          Section #{sec.displayOrder}: {sec.title}
                        </h4>
                        {sec.description && (
                          <div style={{ fontSize: 13, color: C.muted }}>{sec.description}</div>
                        )}
                      </div>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => handleDeleteSection(sec)}
                      >
                        Delete Section
                      </Button>
                    </div>

                    {secLessons.length === 0 ? (
                      <div style={{ color: C.muted, fontSize: 13 }}>
                        No lessons in this section yet.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {secLessons.map(les => (
                          <div key={les.id} style={rowBox}>
                            <div>
                              <div style={{ fontWeight: 800, color: C.text }}>
                                #{les.displayOrder} — {les.title}
                              </div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                                Type: <strong>{les.lessonType.toUpperCase()}</strong>
                                {les.lessonType === "video"
                                  ? ` (${les.videoSourceType}, ${les.durationSeconds}s, min ${les.minWatchPercent}%)`
                                  : ""}{" "}
                                • {les.isRequired ? "Required" : "Optional"} •{" "}
                                <strong>{les.isPublished ? "Published" : "Draft"}</strong>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button variant="secondary" onClick={() => startEditLesson(les)}>
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                disabled={busy}
                                onClick={() => handleDeleteLesson(les)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "resources" && (
            <div style={{ display: "grid", gap: 16 }}>
              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>
                  Upload Downloadable Course or Lesson Resource
                </h3>
                <form onSubmit={handleSaveResource} style={{ display: "grid", gap: 12 }}>
                  <div style={threeCol}>
                    <div>
                      <label style={labelStyle}>Resource Title *</label>
                      <Input
                        value={resTitle}
                        onChange={setResTitle}
                        placeholder="e.g. Week 1 Study Guide (PDF)"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Attach to Lesson (Optional)</label>
                      <select
                        value={resLessonId}
                        onChange={e => setResLessonId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Course-Wide Resource</option>
                        {lessons.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Upload File</label>
                      <input
                        type="file"
                        onChange={e => setResFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Or External Resource Link</label>
                    <Input
                      value={resExternalUrl}
                      onChange={setResExternalUrl}
                      placeholder="https://..."
                    />
                  </div>

                  <label style={chipLabel}>
                    <input
                      type="checkbox"
                      checked={resDownloadable}
                      onChange={e => setResDownloadable(e.target.checked)}
                    />
                    Allow Enrolled Students to Download
                  </label>

                  <div>
                    <Button type="submit" disabled={busy || !resTitle.trim()}>
                      {busy ? "Uploading..." : "Add Resource"}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>Course Resources</h3>
                {resources.length === 0 ? (
                  <div style={{ color: C.muted }}>No resources uploaded yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {resources.map(res => (
                      <div key={res.id} style={rowBox}>
                        <div>
                          <div style={{ fontWeight: 800, color: C.text }}>{res.title}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            Type: {res.fileType} •{" "}
                            {res.lessonId ? "Lesson Attachment" : "Course Resource"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button variant="secondary" onClick={() => handlePreviewResource(res)}>
                            Open
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={async () => {
                              if (!course) return;
                              await deleteProgramResource(res.id);
                              await refreshStudio(course.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === "quizzes" && (
            <div style={{ display: "grid", gap: 16 }}>
              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>
                  {editingQuizId ? "Edit Course Quiz" : "Create Course Quiz"}
                </h3>
                {editingQuizHasAttempts && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#fef3c7",
                      border: "1px solid #f59e0b",
                      color: "#92400e",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    Students have already attempted this quiz. Question editing is locked to protect
                    existing grades; saving will update quiz settings only.
                  </div>
                )}

                <form onSubmit={handleSaveQuiz} style={{ display: "grid", gap: 12 }}>
                  <div style={threeCol}>
                    <div>
                      <label style={labelStyle}>Quiz Title *</label>
                      <Input
                        value={qTitle}
                        onChange={setQTitle}
                        placeholder="e.g. Module 1 Assessment"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Section (Optional)</label>
                      <select
                        value={qSectionId}
                        onChange={e => setQSectionId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Course-Level Quiz</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Pass Mark (%)</label>
                      <Input type="number" value={qPassMark} onChange={setQPassMark} />
                    </div>
                  </div>

                  <div style={threeCol}>
                    <div>
                      <label style={labelStyle}>Max Attempts Allowed</label>
                      <Input
                        type="number"
                        value={qAttemptsAllowed}
                        onChange={setQAttemptsAllowed}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Time Limit (Minutes, blank = untimed)</label>
                      <Input type="number" value={qTimeLimit} onChange={setQTimeLimit} />
                    </div>
                    <div>
                      <label style={labelStyle}>Deadline (Optional, WAT)</label>
                      <Input type="datetime-local" value={qDeadline} onChange={setQDeadline} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Quiz Instructions</label>
                    <Input
                      value={qDescription}
                      onChange={setQDescription}
                      placeholder="Instructions shown before student starts attempt"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <label style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={qRequired}
                        onChange={e => setQRequired(e.target.checked)}
                      />
                      Required to Pass Course
                    </label>
                    <label style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={qPublished}
                        onChange={e => setQPublished(e.target.checked)}
                      />
                      Published
                    </label>
                    <label style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={qShowResult}
                        onChange={e => setQShowResult(e.target.checked)}
                      />
                      Show Score Immediately
                    </label>
                  </div>

                  {!editingQuizHasAttempts && (
                    <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ color: C.text }}>Questions ({draftQuestions.length})</strong>
                        <Button
                          variant="secondary"
                          onClick={() => setDraftQuestions(prev => [...prev, emptyQuestion()])}
                        >
                          + Add Question
                        </Button>
                      </div>

                      {draftQuestions.map((dq, qIdx) => (
                        <div
                          key={qIdx}
                          style={{
                            padding: 14,
                            border: "1px solid " + C.border,
                            borderRadius: 12,
                            background: "#f8fafc",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <div style={threeCol}>
                            <div>
                              <label style={labelStyle}>Question #{qIdx + 1} Type</label>
                              <select
                                value={dq.questionType}
                                onChange={e =>
                                  updateDraftQuestion(qIdx, {
                                    questionType: e.target.value as SpecialProgramQuizQuestionType,
                                  })
                                }
                                style={selectStyle}
                              >
                                <option value="single_choice">Single Choice</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="true_false">True / False</option>
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Points</label>
                              <Input
                                type="number"
                                value={dq.points}
                                onChange={v => updateDraftQuestion(qIdx, { points: v })}
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "end", justifyContent: "end" }}>
                              {draftQuestions.length > 1 && (
                                <Button
                                  variant="danger"
                                  onClick={() =>
                                    setDraftQuestions(prev => prev.filter((_, i) => i !== qIdx))
                                  }
                                >
                                  Remove Question
                                </Button>
                              )}
                            </div>
                          </div>

                          <div>
                            <label style={labelStyle}>Question Prompt *</label>
                            <Input
                              value={dq.questionText}
                              onChange={v => updateDraftQuestion(qIdx, { questionText: v })}
                              placeholder="Enter question..."
                            />
                          </div>

                          <div style={{ display: "grid", gap: 6 }}>
                            <label style={labelStyle}>
                              Options (check the correct answer{dq.questionType === "multiple_choice" ? "s" : ""})
                            </label>
                            {dq.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                style={{ display: "flex", gap: 8, alignItems: "center" }}
                              >
                                <input
                                  type={dq.questionType === "multiple_choice" ? "checkbox" : "radio"}
                                  name={`q_correct_${qIdx}`}
                                  checked={opt.isCorrect}
                                  onChange={() => toggleOptionCorrect(qIdx, optIdx)}
                                />
                                <div style={{ flex: 1 }}>
                                  <Input
                                    value={opt.optionText}
                                    onChange={val =>
                                      updateDraftQuestion(qIdx, {
                                        options: dq.options.map((o, oI) =>
                                          oI === optIdx ? { ...o, optionText: val } : o
                                        ),
                                      })
                                    }
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                </div>
                                {dq.questionType !== "true_false" && dq.options.length > 2 && (
                                  <Button
                                    variant="secondary"
                                    onClick={() =>
                                      updateDraftQuestion(qIdx, {
                                        options: dq.options.filter((_, oI) => oI !== optIdx),
                                      })
                                    }
                                  >
                                    X
                                  </Button>
                                )}
                              </div>
                            ))}
                            {dq.questionType !== "true_false" && (
                              <div>
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    updateDraftQuestion(qIdx, {
                                      options: [
                                        ...dq.options,
                                        { optionText: "", isCorrect: false },
                                      ],
                                    })
                                  }
                                >
                                  + Add Option
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving Quiz..." : editingQuizId ? "Update Quiz" : "Save Quiz"}
                    </Button>
                    {editingQuizId && (
                      <Button variant="secondary" onClick={resetQuizBuilder}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>Existing Course Quizzes</h3>
                {quizzes.length === 0 ? (
                  <div style={{ color: C.muted }}>No quizzes created for this course yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {quizzes.map(qz => {
                      const qCount = questions.filter(q => q.quizId === qz.id).length;
                      const attCount = attempts.filter(a => a.quizId === qz.id).length;
                      return (
                        <div key={qz.id} style={rowBox}>
                          <div>
                            <div style={{ fontWeight: 800, color: C.text }}>{qz.title}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                              Questions: {qCount} • Pass Mark: {qz.passMarkPercent}% • Attempts
                              Allowed: {qz.attemptsAllowed} • Student Attempts: {attCount} •{" "}
                              <strong>{qz.isPublished ? "Published" : "Draft"}</strong>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button variant="secondary" onClick={() => loadQuizIntoBuilder(qz)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              disabled={busy}
                              onClick={() => handleDeleteQuiz(qz)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === "learners" && (
            <Card>
              <h3 style={{ margin: "0 0 12px", color: C.text }}>
                Enrolled Learners & Course Progress
              </h3>
              {enrollments.length === 0 ? (
                <div style={{ color: C.muted }}>No learners enrolled in this program yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {enrollments.map(enr => {
                    const student = usersMap[enr.studentId];
                    const completedLessons = lessonProgress.filter(
                      lp => lp.studentId === enr.studentId && lp.status === "completed"
                    ).length;
                    const studentAttempts = attempts.filter(
                      a => a.studentId === enr.studentId && a.status === "submitted"
                    );
                    const bestScore = studentAttempts.length
                      ? Math.max(...studentAttempts.map(a => Number(a.scorePercent ?? 0)))
                      : null;

                    return (
                      <div key={enr.id} style={rowBox}>
                        <div>
                          <div style={{ fontWeight: 800, color: C.text }}>
                            {student?.name || enr.studentId}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                            Program Status: <strong>{enr.status.toUpperCase()}</strong> •
                            Lessons Completed: <strong>{completedLessons}</strong> /{" "}
                            {lessons.length} • Best Quiz Score:{" "}
                            <strong>{bestScore != null ? `${bestScore}%` : "N/A"}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

const threeCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: C.text,
  marginBottom: 6,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  background: "#fff",
  color: C.text,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  fontFamily: "inherit",
};

const chipLabel: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  background: "#f8fafc",
  fontSize: 13,
  fontWeight: 700,
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 800,
};

const rowBox: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: 14,
  border: "1px solid " + C.border,
  borderRadius: 12,
  background: "#f8fafc",
};