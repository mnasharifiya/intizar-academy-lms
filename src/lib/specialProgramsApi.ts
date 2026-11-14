import { supabase } from "./supabase";

export type SpecialProgramStatus =
  | "draft"
  | "published"
  | "enrollment_open"
  | "enrollment_closed"
  | "active"
  | "completed"
  | "archived";

export type SpecialProgramEnrollmentMode =
  | "admin_only"
  | "open_to_eligible"
  | "approval_required";

export type SpecialProgramCourseStatus = "draft" | "published" | "archived";

export type SpecialProgramLessonType =
  | "video"
  | "pdf"
  | "presentation"
  | "document"
  | "external_link"
  | "text";

export type SpecialProgramVideoSourceType = "storage" | "external";

export type SpecialProgramEnrollmentStatus =
  | "pending"
  | "active"
  | "suspended"
  | "completed"
  | "withdrawn";

export type SpecialProgramQuizQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false";

export interface SpecialProgram {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  objectives: string[];
  coverImagePath: string | null;
  category: string;
  status: SpecialProgramStatus;
  isSelfPaced: boolean;
  enrollmentMode: SpecialProgramEnrollmentMode;
  eligibleLevelIds: string[] | null;
  maxEnrollments: number | null;
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  certificateEnabled: boolean;
  completionRules: {
    require_all_required_lessons: boolean;
    require_all_required_quizzes: boolean;
    min_average_score: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramInstructorAssignment {
  id: string;
  programId: string;
  instructorId: string;
  role: "program_lead" | "co_lead";
  isActive: boolean;
  assignedBy: string;
  assignedAt: string;
  instructorName?: string | null;
  instructorEmail?: string | null;
}

export interface ProgramCourse {
  id: string;
  programId: string;
  title: string;
  description: string | null;
  instructorId: string;
  displayOrder: number;
  isRequired: boolean;
  deadlineAt: string | null;
  status: SpecialProgramCourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramSection {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramLesson {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  description: string | null;
  lessonType: SpecialProgramLessonType;
  videoSourceType: SpecialProgramVideoSourceType | null;
  contentBody: string | null;
  mediaStoragePath: string | null;
  externalUrl: string | null;
  durationSeconds: number;
  minWatchPercent: number;
  isRequired: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramResource {
  id: string;
  programId: string;
  courseId: string | null;
  sectionId: string | null;
  lessonId: string | null;
  title: string;
  fileType: string;
  storagePath: string | null;
  externalUrl: string | null;
  fileSizeBytes: number | null;
  isDownloadable: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface ProgramEnrollment {
  id: string;
  programId: string;
  studentId: string;
  status: SpecialProgramEnrollmentStatus;
  enrolledBy: string;
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  lastAccessedAt: string | null;
  lastLessonId: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
}

export interface LessonProgressRecord {
  id: string;
  enrollmentId: string;
  lessonId: string;
  studentId: string;
  status: "not_started" | "in_progress" | "completed";
  lastPositionSeconds: number;
  watchedSeconds: number;
  progressPercent: number;
  completedAt: string | null;
  lastHeartbeatAt: string | null;
  updatedAt: string;
}

export interface ProgramQuiz {
  id: string;
  courseId: string;
  sectionId: string | null;
  title: string;
  description: string | null;
  passMarkPercent: number;
  attemptsAllowed: number;
  timeLimitMinutes: number | null;
  isRequired: boolean;
  isPublished: boolean;
  showResultImmediately: boolean;
  deadlineAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramQuizQuestion {
  id: string;
  quizId: string;
  questionType: SpecialProgramQuizQuestionType;
  questionText: string;
  explanation: string | null;
  points: number;
  displayOrder: number;
}

export interface ProgramQuizOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect?: boolean;
  displayOrder: number;
}

export interface ProgramQuizAttempt {
  id: string;
  quizId: string;
  enrollmentId: string;
  studentId: string;
  attemptNumber: number;
  status: "in_progress" | "submitted" | "expired";
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  scorePoints: number | null;
  maxPoints: number | null;
  scorePercent: number | null;
  passed: boolean | null;
}

export interface ProgramCertificate {
  id: string;
  certificateNo: string;
  verificationToken: string;
  enrollmentId: string;
  programId: string;
  studentId: string;
  studentName: string;
  regNo: string | null;
  programTitle: string;
  completionSnapshot: Record<string, any>;
  status: "valid" | "revoked";
  issuedAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface ProgramLessonBookmark {
  id: string;
  studentId: string;
  lessonId: string;
  note: string | null;
  createdAt: string;
}

export interface ProgramDiscussion {
  id: string;
  programId: string;
  courseId: string;
  lessonId: string | null;
  authorId: string;
  parentId: string | null;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface SpecialProgramsRoleContext {
  userId: string;
  isMainAdmin: boolean;
  leadProgramIds: string[];
  instructorCourseIds: string[];
  enrollments: ProgramEnrollment[];
}

export function spWatDateTimeToIso(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed + ":00+01:00").toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed + "+01:00").toISOString();
  }
  return new Date(trimmed).toISOString();
}

export function spIsoToWatInput(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const watMs = date.getTime() + 60 * 60 * 1000;
  const wat = new Date(watMs);
  return wat.toISOString().slice(0, 16);
}

export function makeProgramSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "program"}-${suffix}`;
}

function mapProgram(row: any): SpecialProgram {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? null,
    objectives: Array.isArray(row.objectives) ? row.objectives : [],
    coverImagePath: row.cover_image_path ?? null,
    category: row.category ?? "general",
    status: row.status,
    isSelfPaced: Boolean(row.is_self_paced),
    enrollmentMode: row.enrollment_mode ?? "open_to_eligible",
    eligibleLevelIds: Array.isArray(row.eligible_level_ids) ? row.eligible_level_ids : null,
    maxEnrollments: row.max_enrollments ?? null,
    enrollmentOpensAt: row.enrollment_opens_at ?? null,
    enrollmentClosesAt: row.enrollment_closes_at ?? null,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    certificateEnabled: Boolean(row.certificate_enabled),
    completionRules: {
      require_all_required_lessons: row.completion_rules?.require_all_required_lessons ?? true,
      require_all_required_quizzes: row.completion_rules?.require_all_required_quizzes ?? true,
      min_average_score: Number(row.completion_rules?.min_average_score ?? 0),
    },
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachInstructorProfiles(assignments: ProgramInstructorAssignment[]): Promise<ProgramInstructorAssignment[]> {
  const ids = Array.from(new Set(assignments.map(a => a.instructorId).filter(Boolean)));
  if (ids.length === 0) return assignments;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  const byId = new Map<string, { full_name?: string | null; email?: string | null }>();
  (data || []).forEach((p: any) => byId.set(p.id, p));
  return assignments.map(a => {
    const prof = byId.get(a.instructorId);
    return {
      ...a,
      instructorName: a.instructorName ?? prof?.full_name ?? null,
      instructorEmail: a.instructorEmail ?? prof?.email ?? null,
    };
  });
}

function mapInstructorAssignment(row: any): ProgramInstructorAssignment {
  return {
    id: row.id,
    programId: row.program_id,
    instructorId: row.instructor_id,
    role: row.role,
    isActive: Boolean(row.is_active),
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    instructorName: row.full_name ?? row.profiles?.full_name ?? null,
    instructorEmail: row.email ?? row.profiles?.email ?? null,
  };
}

function mapCourse(row: any): ProgramCourse {
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    description: row.description ?? null,
    instructorId: row.instructor_id,
    displayOrder: Number(row.display_order ?? 0),
    isRequired: Boolean(row.is_required),
    deadlineAt: row.deadline_at ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: any): ProgramSection {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description ?? null,
    displayOrder: Number(row.display_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLesson(row: any): ProgramLesson {
  return {
    id: row.id,
    sectionId: row.section_id,
    courseId: row.course_id,
    title: row.title,
    description: row.description ?? null,
    lessonType: row.lesson_type,
    videoSourceType: row.video_source_type ?? null,
    contentBody: row.content_body ?? null,
    mediaStoragePath: row.media_storage_path ?? null,
    externalUrl: row.external_url ?? null,
    durationSeconds: Number(row.duration_seconds ?? 0),
    minWatchPercent: Number(row.min_watch_percent ?? 85),
    isRequired: Boolean(row.is_required),
    isPublished: Boolean(row.is_published),
    displayOrder: Number(row.display_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResource(row: any): ProgramResource {
  return {
    id: row.id,
    programId: row.program_id,
    courseId: row.course_id ?? null,
    sectionId: row.section_id ?? null,
    lessonId: row.lesson_id ?? null,
    title: row.title,
    fileType: row.file_type,
    storagePath: row.storage_path ?? null,
    externalUrl: row.external_url ?? null,
    fileSizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    isDownloadable: Boolean(row.is_downloadable),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function mapEnrollment(row: any): ProgramEnrollment {
  return {
    id: row.id,
    programId: row.program_id,
    studentId: row.student_id,
    status: row.status,
    enrolledBy: row.enrolled_by,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at ?? null,
    progressPercent: Number(row.progress_percent ?? 0),
    lastAccessedAt: row.last_accessed_at ?? null,
    lastLessonId: row.last_lesson_id ?? null,
    studentName: row.full_name ?? row.name ?? row.profiles?.full_name ?? null,
    studentEmail: row.email ?? row.profiles?.email ?? null,
  };
}

function mapLessonProgress(row: any): LessonProgressRecord {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    lessonId: row.lesson_id,
    studentId: row.student_id,
    status: row.status,
    lastPositionSeconds: Number(row.last_position_seconds ?? 0),
    watchedSeconds: Number(row.watched_seconds ?? 0),
    progressPercent: Number(row.progress_percent ?? 0),
    completedAt: row.completed_at ?? null,
    lastHeartbeatAt: row.last_heartbeat_at ?? null,
    updatedAt: row.updated_at,
  };
}

function mapQuiz(row: any): ProgramQuiz {
  return {
    id: row.id,
    courseId: row.course_id,
    sectionId: row.section_id ?? null,
    title: row.title,
    description: row.description ?? null,
    passMarkPercent: Number(row.pass_mark_percent ?? 70),
    attemptsAllowed: Number(row.attempts_allowed ?? 1),
    timeLimitMinutes: row.time_limit_minutes != null ? Number(row.time_limit_minutes) : null,
    isRequired: Boolean(row.is_required),
    isPublished: Boolean(row.is_published),
    showResultImmediately: Boolean(row.show_result_immediately),
    deadlineAt: row.deadline_at ?? null,
    displayOrder: Number(row.display_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuizQuestion(row: any): ProgramQuizQuestion {
  return {
    id: row.id,
    quizId: row.quiz_id,
    questionType: row.question_type,
    questionText: row.question_text,
    explanation: row.explanation ?? null,
    points: Number(row.points ?? 1),
    displayOrder: Number(row.display_order ?? 0),
  };
}

function mapQuizOption(row: any): ProgramQuizOption {
  return {
    id: row.id,
    questionId: row.question_id,
    optionText: row.option_text,
    isCorrect: typeof row.is_correct === "boolean" ? row.is_correct : undefined,
    displayOrder: Number(row.display_order ?? 0),
  };
}

function mapQuizAttempt(row: any): ProgramQuizAttempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    enrollmentId: row.enrollment_id,
    studentId: row.student_id,
    attemptNumber: Number(row.attempt_number ?? 1),
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at ?? null,
    submittedAt: row.submitted_at ?? null,
    scorePoints: row.score_points != null ? Number(row.score_points) : null,
    maxPoints: row.max_points != null ? Number(row.max_points) : null,
    scorePercent: row.score_percent != null ? Number(row.score_percent) : null,
    passed: typeof row.passed === "boolean" ? row.passed : null,
  };
}

function mapCertificate(row: any): ProgramCertificate {
  return {
    id: row.id,
    certificateNo: row.certificate_no,
    verificationToken: row.verification_token,
    enrollmentId: row.enrollment_id,
    programId: row.program_id,
    studentId: row.student_id,
    studentName: row.student_name,
    regNo: row.reg_no ?? null,
    programTitle: row.program_title,
    completionSnapshot: row.completion_snapshot ?? {},
    status: row.status,
    issuedAt: row.issued_at,
    revokedBy: row.revoked_by ?? null,
    revokedAt: row.revoked_at ?? null,
    revokeReason: row.revoke_reason ?? null,
  };
}

function mapBookmark(row: any): ProgramLessonBookmark {
  return {
    id: row.id,
    studentId: row.student_id,
    lessonId: row.lesson_id,
    note: row.note ?? null,
    createdAt: row.created_at,
  };
}

function mapDiscussion(row: any): ProgramDiscussion {
  return {
    id: row.id,
    programId: row.program_id,
    courseId: row.course_id,
    lessonId: row.lesson_id ?? null,
    authorId: row.author_id,
    parentId: row.parent_id ?? null,
    body: row.body,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Authentication required.");
  return userId;
}

export async function loadSpecialProgramsRoleContext(): Promise<SpecialProgramsRoleContext> {
  const userId = await requireUserId();

  const [isMainAdminRes, leadsRes, coursesRes, enrollmentsRes] = await Promise.all([
    (supabase as any).rpc("is_main_admin"),
    supabase
      .from("program_instructors")
      .select("program_id")
      .eq("instructor_id", userId)
      .eq("is_active", true),
    supabase
      .from("program_courses")
      .select("id")
      .eq("instructor_id", userId),
    supabase
      .from("program_enrollments")
      .select("*")
      .eq("student_id", userId),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;

  return {
    userId,
    isMainAdmin: Boolean(isMainAdminRes.data),
    leadProgramIds: (leadsRes.data ?? []).map((r: any) => r.program_id as string),
    instructorCourseIds: (coursesRes.data ?? []).map((r: any) => r.id as string),
    enrollments: (enrollmentsRes.data ?? []).map(mapEnrollment),
  };
}

export async function loadSpecialProgramsOverviewList() {
  const [programsRes, coursesRes, leadsRes, enrollmentsRes, certsRes] = await Promise.all([
    supabase.from("special_programs").select("*").order("created_at", { ascending: false }),
    supabase.from("program_courses").select("*").order("display_order", { ascending: true }),
    supabase.from("program_instructors").select("*").eq("is_active", true),
    supabase.from("program_enrollments").select("*").order("enrolled_at", { ascending: false }),
    supabase.from("program_certificates").select("*").order("issued_at", { ascending: false }),
  ]);

  if (programsRes.error) throw programsRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (leadsRes.error) throw leadsRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;
  if (certsRes.error) throw certsRes.error;

  return {
    programs: (programsRes.data ?? []).map(mapProgram),
    courses: (coursesRes.data ?? []).map(mapCourse),
    leads: (leadsRes.data ?? []).map(mapInstructorAssignment),
    enrollments: (enrollmentsRes.data ?? []).map(mapEnrollment),
    certificates: (certsRes.data ?? []).map(mapCertificate),
  };
}

export async function createSpecialProgram(input: {
  title: string;
  description?: string;
  objectives?: string[];
  coverImagePath?: string | null;
  category?: string;
  isSelfPaced?: boolean;
  enrollmentMode?: SpecialProgramEnrollmentMode;
  eligibleLevelIds?: string[] | null;
  maxEnrollments?: number | null;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  certificateEnabled?: boolean;
  completionRules?: {
    require_all_required_lessons: boolean;
    require_all_required_quizzes: boolean;
    min_average_score: number;
  };
}): Promise<SpecialProgram> {
  const userId = await requireUserId();
  if (!input.title.trim()) throw new Error("Program title is required.");

  const { data, error } = await supabase
    .from("special_programs")
    .insert({
      title: input.title.trim(),
      slug: makeProgramSlug(input.title),
      description: input.description?.trim() || null,
      objectives: (input.objectives ?? []).map(o => o.trim()).filter(Boolean),
      cover_image_path: input.coverImagePath ?? null,
      category: input.category?.trim() || "general",
      status: "draft",
      is_self_paced: input.isSelfPaced ?? true,
      enrollment_mode: input.enrollmentMode ?? "open_to_eligible",
      eligible_level_ids:
        input.eligibleLevelIds && input.eligibleLevelIds.length > 0
          ? input.eligibleLevelIds
          : null,
      max_enrollments: input.maxEnrollments ?? null,
      enrollment_opens_at: spWatDateTimeToIso(input.enrollmentOpensAt),
      enrollment_closes_at: spWatDateTimeToIso(input.enrollmentClosesAt),
      starts_at: spWatDateTimeToIso(input.startsAt),
      ends_at: spWatDateTimeToIso(input.endsAt),
      certificate_enabled: input.certificateEnabled ?? true,
      completion_rules: input.completionRules ?? {
        require_all_required_lessons: true,
        require_all_required_quizzes: true,
        min_average_score: 0,
      },
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapProgram(data);
}

export async function updateSpecialProgram(
  programId: string,
  input: Partial<{
    title: string;
    description: string | null;
    objectives: string[];
    coverImagePath: string | null;
    category: string;
    isSelfPaced: boolean;
    enrollmentMode: SpecialProgramEnrollmentMode;
    eligibleLevelIds: string[] | null;
    maxEnrollments: number | null;
    enrollmentOpensAt: string | null;
    enrollmentClosesAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
    certificateEnabled: boolean;
    completionRules: {
      require_all_required_lessons: boolean;
      require_all_required_quizzes: boolean;
      min_average_score: number;
    };
  }>
): Promise<SpecialProgram> {
  const payload: Record<string, any> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.objectives !== undefined) {
    payload.objectives = input.objectives.map(o => o.trim()).filter(Boolean);
  }
  if (input.coverImagePath !== undefined) payload.cover_image_path = input.coverImagePath;
  if (input.category !== undefined) payload.category = input.category.trim() || "general";
  if (input.isSelfPaced !== undefined) payload.is_self_paced = input.isSelfPaced;
  if (input.enrollmentMode !== undefined) payload.enrollment_mode = input.enrollmentMode;
  if (input.eligibleLevelIds !== undefined) {
    payload.eligible_level_ids =
      input.eligibleLevelIds && input.eligibleLevelIds.length > 0
        ? input.eligibleLevelIds
        : null;
  }
  if (input.maxEnrollments !== undefined) payload.max_enrollments = input.maxEnrollments;
  if (input.enrollmentOpensAt !== undefined) {
    payload.enrollment_opens_at = spWatDateTimeToIso(input.enrollmentOpensAt);
  }
  if (input.enrollmentClosesAt !== undefined) {
    payload.enrollment_closes_at = spWatDateTimeToIso(input.enrollmentClosesAt);
  }
  if (input.startsAt !== undefined) payload.starts_at = spWatDateTimeToIso(input.startsAt);
  if (input.endsAt !== undefined) payload.ends_at = spWatDateTimeToIso(input.endsAt);
  if (input.certificateEnabled !== undefined) {
    payload.certificate_enabled = input.certificateEnabled;
  }
  if (input.completionRules !== undefined) payload.completion_rules = input.completionRules;

  const { data, error } = await supabase
    .from("special_programs")
    .update(payload)
    .eq("id", programId)
    .select("*")
    .single();

  if (error) throw error;
  return mapProgram(data);
}

export async function deleteSpecialProgram(programId: string): Promise<void> {
  const { error } = await supabase.from("special_programs").delete().eq("id", programId);
  if (error) throw error;
}

export async function transitionSpecialProgramStatus(
  programId: string,
  newStatus: SpecialProgramStatus
): Promise<SpecialProgram> {
  const { data, error } = await (supabase as any).rpc("transition_program_status", {
    p_program_id: programId,
    p_new_status: newStatus,
  });
  if (error) throw error;
  return mapProgram(data);
}

export async function assignProgramLead(
  programId: string,
  instructorId: string,
  role: "program_lead" | "co_lead" = "program_lead"
): Promise<ProgramInstructorAssignment> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("program_instructors")
    .upsert(
      {
        program_id: programId,
        instructor_id: instructorId,
        role,
        is_active: true,
        assigned_by: userId,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "program_id,instructor_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapInstructorAssignment(data);
}

export async function removeProgramLead(assignmentId: string): Promise<void> {
  const { error } = await supabase.from("program_instructors").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function createProgramCourse(input: {
  programId: string;
  title: string;
  description?: string;
  instructorId: string;
  displayOrder?: number;
  isRequired?: boolean;
  deadlineAt?: string | null;
  status?: SpecialProgramCourseStatus;
}): Promise<ProgramCourse> {
  if (!input.title.trim()) throw new Error("Course title is required.");
  if (!input.instructorId) throw new Error("Course instructor is required.");

  const { data, error } = await supabase
    .from("program_courses")
    .insert({
      program_id: input.programId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      instructor_id: input.instructorId,
      display_order: input.displayOrder ?? 0,
      is_required: input.isRequired ?? true,
      deadline_at: spWatDateTimeToIso(input.deadlineAt),
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapCourse(data);
}

export async function updateProgramCourse(
  courseId: string,
  input: Partial<{
    title: string;
    description: string | null;
    instructorId: string;
    displayOrder: number;
    isRequired: boolean;
    deadlineAt: string | null;
    status: SpecialProgramCourseStatus;
  }>
): Promise<ProgramCourse> {
  const payload: Record<string, any> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.instructorId !== undefined) payload.instructor_id = input.instructorId;
  if (input.displayOrder !== undefined) payload.display_order = input.displayOrder;
  if (input.isRequired !== undefined) payload.is_required = input.isRequired;
  if (input.deadlineAt !== undefined) payload.deadline_at = spWatDateTimeToIso(input.deadlineAt);
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("program_courses")
    .update(payload)
    .eq("id", courseId)
    .select("*")
    .single();

  if (error) throw error;
  return mapCourse(data);
}

export async function deleteProgramCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from("program_courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function setCoursePrerequisites(
  courseId: string,
  prerequisiteCourseIds: string[]
): Promise<void> {
  const { error: delError } = await supabase
    .from("program_course_prerequisites")
    .delete()
    .eq("course_id", courseId);
  if (delError) throw delError;

  const uniqueIds = Array.from(new Set(prerequisiteCourseIds)).filter(id => id && id !== courseId);
  if (!uniqueIds.length) return;

  const { error: insError } = await supabase
    .from("program_course_prerequisites")
    .insert(
      uniqueIds.map(prereqId => ({
        course_id: courseId,
        prerequisite_course_id: prereqId,
      }))
    );
  if (insError) throw insError;
}

export async function manageProgramEnrollment(
  programId: string,
  action: "enroll" | "approve" | "suspend" | "reactivate" | "withdraw",
  studentId?: string | null
): Promise<ProgramEnrollment> {
  const { data, error } = await (supabase as any).rpc("manage_program_enrollment", {
    p_program_id: programId,
    p_student_id: studentId ?? null,
    p_action: action,
  });
  if (error) throw error;
  return mapEnrollment(data);
}

export async function loadProgramAnalyticsBundle(programId: string) {
  const [
    programRes,
    coursesRes,
    leadsRes,
    enrollmentsRes,
    progressRes,
    attemptsRes,
    certsRes,
    logsRes,
  ] = await Promise.all([
    supabase.from("special_programs").select("*").eq("id", programId).single(),
    supabase.from("program_courses").select("*").eq("program_id", programId).order("display_order"),
    supabase.from("program_instructors").select("*").eq("program_id", programId),
    supabase.from("program_enrollments").select("*").eq("program_id", programId).order("enrolled_at", { ascending: false }),
    supabase
      .from("lesson_progress")
      .select("*, program_lessons!inner(course_id, program_courses!inner(program_id))")
      .eq("program_lessons.program_courses.program_id", programId),
    supabase
      .from("program_quiz_attempts")
      .select("*, program_quizzes!inner(course_id, program_courses!inner(program_id))")
      .eq("program_quizzes.program_courses.program_id", programId),
    supabase.from("program_certificates").select("*").eq("program_id", programId),
    supabase
      .from("program_activity_logs")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (programRes.error) throw programRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (leadsRes.error) throw leadsRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (attemptsRes.error) throw attemptsRes.error;
  if (certsRes.error) throw certsRes.error;
  if (logsRes.error) throw logsRes.error;

  const enrollments = (enrollmentsRes.data ?? []).map(mapEnrollment);
  const attempts = (attemptsRes.data ?? []).map(mapQuizAttempt);
  const certificates = (certsRes.data ?? []).map(mapCertificate);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const activeEnrollments = enrollments.filter(e => ["active", "enrolled", "approved", "completed"].includes(String(e.status || "").toLowerCase()));
  const inactiveLearners = enrollments.filter(e => {
    if (!["active", "enrolled", "approved"].includes(String(e.status || "").toLowerCase())) return false;
    const lastTs = e.lastAccessedAt ? new Date(e.lastAccessedAt).getTime() : new Date(e.enrolledAt).getTime();
    return lastTs < sevenDaysAgo;
  });
  const completedLearners = enrollments.filter(e => e.status === "completed");
  const submittedAttempts = attempts.filter(a => a.status === "submitted" && a.scorePercent != null);
  const avgQuizScore = submittedAttempts.length
    ? Math.round(
        (submittedAttempts.reduce((sum, a) => sum + Number(a.scorePercent ?? 0), 0) /
          submittedAttempts.length) *
          100
      ) / 100
    : 0;
  const avgProgress = activeEnrollments.length
    ? Math.round(
        (activeEnrollments.reduce((sum, e) => sum + e.progressPercent, 0) /
          activeEnrollments.length) *
          100
      ) / 100
    : 0;

  return {
    program: mapProgram(programRes.data),
    courses: (coursesRes.data ?? []).map(mapCourse),
    leads: (leadsRes.data ?? []).map(mapInstructorAssignment),
    enrollments,
    lessonProgress: (progressRes.data ?? []).map(mapLessonProgress),
    attempts,
    certificates,
    activityLogs: logsRes.data ?? [],
    metrics: {
      totalEnrolled: enrollments.length,
      activeCount: activeEnrollments.length,
      inactiveCount: inactiveLearners.length,
      completedCount: completedLearners.length,
      averageProgressPercent: avgProgress,
      averageQuizScorePercent: avgQuizScore,
      certificatesIssued: certificates.filter(c => c.status === "valid").length,
    },
  };
}

export async function loadCourseStudioBundle(courseId: string) {
  const [courseRes, sectionsRes, lessonsRes, resourcesRes, quizzesRes] = await Promise.all([
    supabase.from("program_courses").select("*").eq("id", courseId).single(),
    supabase.from("program_sections").select("*").eq("course_id", courseId).order("display_order"),
    supabase.from("program_lessons").select("*").eq("course_id", courseId).order("display_order"),
    supabase.from("program_resources").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
    supabase.from("program_quizzes").select("*").eq("course_id", courseId).order("display_order"),
  ]);

  if (courseRes.error) throw courseRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (lessonsRes.error) throw lessonsRes.error;
  if (resourcesRes.error) throw resourcesRes.error;
  if (quizzesRes.error) throw quizzesRes.error;

  const course = mapCourse(courseRes.data);
  const quizIds = (quizzesRes.data ?? []).map((q: any) => q.id as string);

  let questions: ProgramQuizQuestion[] = [];
  let options: ProgramQuizOption[] = [];
  let attempts: ProgramQuizAttempt[] = [];

  if (quizIds.length > 0) {
    const [qRes, attRes] = await Promise.all([
      supabase.from("program_quiz_questions").select("*").in("quiz_id", quizIds).order("display_order"),
      supabase.from("program_quiz_attempts").select("*").in("quiz_id", quizIds).order("started_at", { ascending: false }),
    ]);
    if (qRes.error) throw qRes.error;
    if (attRes.error) throw attRes.error;
    questions = (qRes.data ?? []).map(mapQuizQuestion);
    attempts = (attRes.data ?? []).map(mapQuizAttempt);

    const qIds = questions.map(q => q.id);
    if (qIds.length > 0) {
      const optRes = await supabase
        .from("program_quiz_options")
        .select("*")
        .in("question_id", qIds)
        .order("display_order");
      if (optRes.error) throw optRes.error;
      options = (optRes.data ?? []).map(mapQuizOption);
    }
  }

  const [enrollmentsRes, progressRes] = await Promise.all([
    supabase.from("program_enrollments").select("*").eq("program_id", course.programId),
    supabase
      .from("lesson_progress")
      .select("*, program_lessons!inner(course_id)")
      .eq("program_lessons.course_id", courseId),
  ]);

  if (enrollmentsRes.error) throw enrollmentsRes.error;
  if (progressRes.error) throw progressRes.error;

  return {
    course,
    sections: (sectionsRes.data ?? []).map(mapSection),
    lessons: (lessonsRes.data ?? []).map(mapLesson),
    resources: (resourcesRes.data ?? []).map(mapResource),
    quizzes: (quizzesRes.data ?? []).map(mapQuiz),
    questions,
    options,
    attempts,
    enrollments: (enrollmentsRes.data ?? []).map(mapEnrollment),
    lessonProgress: (progressRes.data ?? []).map(mapLessonProgress),
  };
}

export async function saveProgramSection(input: {
  id?: string;
  courseId: string;
  title: string;
  description?: string;
  displayOrder?: number;
}): Promise<ProgramSection> {
  if (!input.title.trim()) throw new Error("Section title is required.");
  if (input.id) {
    const { data, error } = await supabase
      .from("program_sections")
      .update({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        display_order: input.displayOrder ?? 0,
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSection(data);
  }

  const { data, error } = await supabase
    .from("program_sections")
    .insert({
      course_id: input.courseId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      display_order: input.displayOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapSection(data);
}

export async function deleteProgramSection(sectionId: string): Promise<void> {
  const { error } = await supabase.from("program_sections").delete().eq("id", sectionId);
  if (error) throw error;
}

export async function saveProgramLesson(input: {
  id?: string;
  sectionId: string;
  courseId: string;
  title: string;
  description?: string;
  lessonType: SpecialProgramLessonType;
  videoSourceType?: SpecialProgramVideoSourceType | null;
  contentBody?: string | null;
  mediaStoragePath?: string | null;
  externalUrl?: string | null;
  durationSeconds?: number;
  minWatchPercent?: number;
  isRequired?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}): Promise<ProgramLesson> {
  if (!input.title.trim()) throw new Error("Lesson title is required.");
  const payload = {
    section_id: input.sectionId,
    course_id: input.courseId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    lesson_type: input.lessonType,
    video_source_type: input.lessonType === "video" ? input.videoSourceType ?? "storage" : null,
    content_body: input.contentBody ?? null,
    media_storage_path: input.mediaStoragePath ?? null,
    external_url: input.externalUrl?.trim() || null,
    duration_seconds: Math.max(0, Math.round(Number(input.durationSeconds ?? 0))),
    min_watch_percent: Math.min(100, Math.max(1, Math.round(Number(input.minWatchPercent ?? 85)))),
    is_required: input.isRequired ?? true,
    is_published: input.isPublished ?? false,
    display_order: input.displayOrder ?? 0,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("program_lessons")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapLesson(data);
  }

  const { data, error } = await supabase
    .from("program_lessons")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return mapLesson(data);
}

export async function deleteProgramLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("program_lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function uploadSpecialProgramAsset(params: {
  programId: string;
  courseId?: string;
  lessonId?: string;
  isCover?: boolean;
  file: File;
}): Promise<string> {
  const cleanName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = crypto.randomUUID();
  const path = params.isCover
    ? `${params.programId}/cover/${uniquePrefix}_${cleanName}`
    : params.lessonId
      ? `${params.programId}/${params.courseId}/${params.lessonId}/${uniquePrefix}_${cleanName}`
      : `${params.programId}/${params.courseId}/general/${uniquePrefix}_${cleanName}`;

  const { error } = await supabase.storage
    .from("special-program-assets")
    .upload(path, params.file, { upsert: false });

  if (error) throw error;
  return path;
}

export async function createSpecialProgramSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("special-program-assets")
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function saveProgramResource(input: {
  programId: string;
  courseId?: string | null;
  sectionId?: string | null;
  lessonId?: string | null;
  title: string;
  fileType: string;
  storagePath?: string | null;
  externalUrl?: string | null;
  fileSizeBytes?: number | null;
  isDownloadable?: boolean;
}): Promise<ProgramResource> {
  const userId = await requireUserId();
  if (!input.title.trim()) throw new Error("Resource title is required.");

  const { data, error } = await supabase
    .from("program_resources")
    .insert({
      program_id: input.programId,
      course_id: input.courseId ?? null,
      section_id: input.sectionId ?? null,
      lesson_id: input.lessonId ?? null,
      title: input.title.trim(),
      file_type: input.fileType,
      storage_path: input.storagePath ?? null,
      external_url: input.externalUrl?.trim() || null,
      file_size_bytes: input.fileSizeBytes ?? null,
      is_downloadable: input.isDownloadable ?? true,
      uploaded_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapResource(data);
}

export async function deleteProgramResource(resourceId: string): Promise<void> {
  const { error } = await supabase.from("program_resources").delete().eq("id", resourceId);
  if (error) throw error;
}

export async function saveProgramQuizAtomic(
  quiz: {
    id?: string;
    courseId: string;
    sectionId?: string | null;
    title: string;
    description?: string | null;
    passMarkPercent: number;
    attemptsAllowed: number;
    timeLimitMinutes?: number | null;
    isRequired: boolean;
    isPublished: boolean;
    showResultImmediately: boolean;
    deadlineAt?: string | null;
    displayOrder?: number;
    settingsOnly?: boolean;
  },
  questions: Array<{
    questionType: SpecialProgramQuizQuestionType;
    questionText: string;
    explanation?: string | null;
    points: number;
    options: Array<{
      optionText: string;
      isCorrect: boolean;
    }>;
  }>
): Promise<ProgramQuiz> {
  const { data, error } = await (supabase as any).rpc("save_program_quiz_atomic", {
    p_quiz: {
      id: quiz.id ?? null,
      course_id: quiz.courseId,
      section_id: quiz.sectionId ?? null,
      title: quiz.title,
      description: quiz.description ?? null,
      pass_mark_percent: quiz.passMarkPercent,
      attempts_allowed: quiz.attemptsAllowed,
      time_limit_minutes: quiz.timeLimitMinutes ?? null,
      is_required: quiz.isRequired,
      is_published: quiz.isPublished,
      show_result_immediately: quiz.showResultImmediately,
      deadline_at: spWatDateTimeToIso(quiz.deadlineAt),
      display_order: quiz.displayOrder ?? 0,
      settings_only: Boolean(quiz.settingsOnly),
    },
    p_questions: questions.map((q, qIdx) => ({
      question_type: q.questionType,
      question_text: q.questionText,
      explanation: q.explanation ?? null,
      points: q.points,
      display_order: qIdx + 1,
      options: q.options.map((o, oIdx) => ({
        option_text: o.optionText,
        is_correct: o.isCorrect,
        display_order: oIdx + 1,
      })),
    })),
  });

  if (error) throw error;
  return mapQuiz(data);
}

export async function deleteProgramQuiz(quizId: string): Promise<void> {
  const { error } = await supabase.from("program_quizzes").delete().eq("id", quizId);
  if (error) throw error;
}

export async function loadStudentProgramWorkspace(programId: string) {
  const userId = await requireUserId();

  const [programRes, coursesRes, enrollmentRes, certRes, discussionsRes] = await Promise.all([
    supabase.from("special_programs").select("*").eq("id", programId).single(),
    supabase
      .from("program_courses")
      .select("*")
      .eq("program_id", programId)
      .eq("status", "published")
      .order("display_order"),
    supabase
      .from("program_enrollments")
      .select("*")
      .eq("program_id", programId)
      .eq("student_id", userId)
      .maybeSingle(),
    supabase
      .from("program_certificates")
      .select("*")
      .eq("program_id", programId)
      .eq("student_id", userId)
      .maybeSingle(),
    supabase
      .from("program_discussions")
      .select("*")
      .eq("program_id", programId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (programRes.error) throw programRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (enrollmentRes.error) throw enrollmentRes.error;
  if (certRes.error) throw certRes.error;
  if (discussionsRes.error) throw discussionsRes.error;

  const courses = (coursesRes.data ?? []).map(mapCourse);
  const courseIds = courses.map(c => c.id);

  let prerequisites: Array<{ courseId: string; prerequisiteCourseId: string }> = [];
  let sections: ProgramSection[] = [];
  let lessons: ProgramLesson[] = [];
  let resources: ProgramResource[] = [];
  let quizzes: ProgramQuiz[] = [];
  let questions: ProgramQuizQuestion[] = [];
  let attempts: ProgramQuizAttempt[] = [];
  let lessonProgress: LessonProgressRecord[] = [];
  let bookmarks: ProgramLessonBookmark[] = [];

  if (courseIds.length > 0) {
    const [prereqRes, secRes, lesRes, resRes, quizRes] = await Promise.all([
      supabase.from("program_course_prerequisites").select("*").in("course_id", courseIds),
      supabase.from("program_sections").select("*").in("course_id", courseIds).order("display_order"),
      supabase
        .from("program_lessons")
        .select("*")
        .in("course_id", courseIds)
        .eq("is_published", true)
        .order("display_order"),
      supabase.from("program_resources").select("*").eq("program_id", programId).order("created_at", { ascending: false }),
      supabase
        .from("program_quizzes")
        .select("*")
        .in("course_id", courseIds)
        .eq("is_published", true)
        .order("display_order"),
    ]);

    if (prereqRes.error) throw prereqRes.error;
    if (secRes.error) throw secRes.error;
    if (lesRes.error) throw lesRes.error;
    if (resRes.error) throw resRes.error;
    if (quizRes.error) throw quizRes.error;

    prerequisites = (prereqRes.data ?? []).map((r: any) => ({
      courseId: r.course_id,
      prerequisiteCourseId: r.prerequisite_course_id,
    }));
    sections = (secRes.data ?? []).map(mapSection);
    lessons = (lesRes.data ?? []).map(mapLesson);
    resources = (resRes.data ?? []).map(mapResource);
    quizzes = (quizRes.data ?? []).map(mapQuiz);

    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length > 0) {
      const [progRes, bmRes] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", userId)
          .in("lesson_id", lessonIds),
        supabase
          .from("program_lesson_bookmarks")
          .select("*")
          .eq("student_id", userId)
          .in("lesson_id", lessonIds),
      ]);
      if (progRes.error) throw progRes.error;
      if (bmRes.error) throw bmRes.error;
      lessonProgress = (progRes.data ?? []).map(mapLessonProgress);
      bookmarks = (bmRes.data ?? []).map(mapBookmark);
    }

    const quizIds = quizzes.map(q => q.id);
    if (quizIds.length > 0) {
      const [qRes, attRes] = await Promise.all([
        supabase.from("program_quiz_questions").select("*").in("quiz_id", quizIds).order("display_order"),
        supabase
          .from("program_quiz_attempts")
          .select("*")
          .eq("student_id", userId)
          .in("quiz_id", quizIds)
          .order("attempt_number", { ascending: false }),
      ]);
      if (qRes.error) throw qRes.error;
      if (attRes.error) throw attRes.error;
      questions = (qRes.data ?? []).map(mapQuizQuestion);
      attempts = (attRes.data ?? []).map(mapQuizAttempt);
    }
  }

  return {
    program: mapProgram(programRes.data),
    enrollment: enrollmentRes.data ? mapEnrollment(enrollmentRes.data) : null,
    certificate: certRes.data ? mapCertificate(certRes.data) : null,
    courses,
    prerequisites,
    sections,
    lessons,
    resources,
    quizzes,
    questions,
    attempts,
    lessonProgress,
    bookmarks,
    discussions: (discussionsRes.data ?? []).map(mapDiscussion),
  };
}

export async function recordLessonProgressSecure(params: {
  lessonId: string;
  positionSeconds?: number;
  deltaSeconds?: number;
  markComplete?: boolean;
}) {
  const { data, error } = await (supabase as any).rpc("record_lesson_progress_secure", {
    p_lesson_id: params.lessonId,
    p_position_seconds: Math.max(0, Math.round(params.positionSeconds ?? 0)),
    p_delta_seconds: Math.max(0, Math.round(params.deltaSeconds ?? 0)),
    p_mark_complete: Boolean(params.markComplete),
  });
  if (error) throw error;
  return {
    lessonProgress: mapLessonProgress(data.lesson_progress),
    enrollment: data.evaluation?.enrollment ? mapEnrollment(data.evaluation.enrollment) : null,
    certificate: data.evaluation?.certificate ? mapCertificate(data.evaluation.certificate) : null,
  };
}

export async function startProgramQuizAttempt(quizId: string): Promise<ProgramQuizAttempt> {
  const { data, error } = await (supabase as any).rpc("start_program_quiz_attempt", {
    p_quiz_id: quizId,
  });
  if (error) throw error;
  return mapQuizAttempt(data);
}

export async function getProgramQuizOptionsSafe(attemptId: string): Promise<ProgramQuizOption[]> {
  const { data, error } = await (supabase as any).rpc("get_program_quiz_options_safe", {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(mapQuizOption) : [];
}

export async function submitProgramQuizAttempt(
  attemptId: string,
  answers: Record<string, string[]>
) {
  const { data, error } = await (supabase as any).rpc("submit_program_quiz_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  if (error) throw error;
  return {
    attempt: mapQuizAttempt(data.attempt),
    enrollment: data.evaluation?.enrollment ? mapEnrollment(data.evaluation.enrollment) : null,
    certificate: data.evaluation?.certificate ? mapCertificate(data.evaluation.certificate) : null,
  };
}

export async function toggleLessonBookmark(lessonId: string, note?: string): Promise<boolean> {
  const userId = await requireUserId();
  const { data: existing, error: selError } = await supabase
    .from("program_lesson_bookmarks")
    .select("id")
    .eq("student_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (selError) throw selError;

  if (existing) {
    const { error: delError } = await supabase
      .from("program_lesson_bookmarks")
      .delete()
      .eq("id", (existing as any).id);
    if (delError) throw delError;
    return false;
  }

  const { error: insError } = await supabase.from("program_lesson_bookmarks").insert({
    student_id: userId,
    lesson_id: lessonId,
    note: note?.trim() || null,
  });
  if (insError) throw insError;
  return true;
}

export async function postProgramDiscussion(input: {
  programId: string;
  courseId: string;
  lessonId?: string | null;
  parentId?: string | null;
  body: string;
}): Promise<ProgramDiscussion> {
  const userId = await requireUserId();
  if (!input.body.trim()) throw new Error("Discussion message cannot be empty.");

  const { data, error } = await supabase
    .from("program_discussions")
    .insert({
      program_id: input.programId,
      course_id: input.courseId,
      lesson_id: input.lessonId ?? null,
      author_id: userId,
      parent_id: input.parentId ?? null,
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapDiscussion(data);
}

export async function deleteProgramDiscussion(discussionId: string): Promise<void> {
  const { error } = await supabase.from("program_discussions").delete().eq("id", discussionId);
  if (error) throw error;
}

export async function revokeProgramCertificate(
  certificateId: string,
  reason: string
): Promise<ProgramCertificate> {
  const { data, error } = await (supabase as any).rpc("revoke_program_certificate", {
    p_certificate_id: certificateId,
    p_reason: reason,
  });
  if (error) throw error;
  return mapCertificate(data);
}

export async function verifySpecialProgramCertificate(input: {
  certificateNo: string;
  verificationToken: string;
}): Promise<{
  id: string;
  certificateNo: string;
  verificationToken: string;
  studentName: string;
  regNo: string | null;
  programTitle: string;
  status: string;
  issuedAt: string;
} | null> {
  const { data, error } = await (supabase as any).rpc("verify_program_certificate", {
    p_certificate_no: input.certificateNo.trim(),
    p_verification_token: input.verificationToken.trim(),
  });
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    certificateNo: data.certificate_no,
    verificationToken: data.verification_token,
    studentName: data.student_name,
    regNo: data.reg_no ?? null,
    programTitle: data.program_title,
    status: data.status,
    issuedAt: data.issued_at,
  };
}


