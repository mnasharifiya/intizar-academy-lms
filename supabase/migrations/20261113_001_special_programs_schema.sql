BEGIN;

CREATE TABLE IF NOT EXISTS public.special_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  objectives text[] NOT NULL DEFAULT '{}',
  cover_image_path text,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'enrollment_open', 'enrollment_closed', 'active', 'completed', 'archived')),
  is_self_paced boolean NOT NULL DEFAULT true,
  enrollment_mode text NOT NULL DEFAULT 'open_to_eligible' CHECK (enrollment_mode IN ('admin_only', 'open_to_eligible', 'approval_required')),
  eligible_level_ids text[] NULL,
  max_enrollments integer NULL CHECK (max_enrollments IS NULL OR max_enrollments > 0),
  enrollment_opens_at timestamptz NULL,
  enrollment_closes_at timestamptz NULL,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  certificate_enabled boolean NOT NULL DEFAULT true,
  completion_rules jsonb NOT NULL DEFAULT '{"require_all_required_lessons": true, "require_all_required_quizzes": true, "min_average_score": 0}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_special_programs_enrollment_window CHECK (enrollment_closes_at IS NULL OR enrollment_opens_at IS NULL OR enrollment_closes_at > enrollment_opens_at),
  CONSTRAINT chk_special_programs_program_window CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.program_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'program_lead' CHECK (role IN ('program_lead', 'co_lead')),
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_program_instructors_program_user UNIQUE (program_id, instructor_id)
);

CREATE TABLE IF NOT EXISTS public.program_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  deadline_at timestamptz NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_course_prerequisites (
  course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  prerequisite_course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CONSTRAINT chk_program_course_prereq_not_self CHECK (course_id <> prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS public.program_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.program_sections(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  lesson_type text NOT NULL CHECK (lesson_type IN ('video', 'pdf', 'presentation', 'document', 'external_link', 'text')),
  video_source_type text NULL CHECK (video_source_type IS NULL OR video_source_type IN ('storage', 'external')),
  content_body text,
  media_storage_path text,
  external_url text,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  min_watch_percent integer NOT NULL DEFAULT 85 CHECK (min_watch_percent BETWEEN 1 AND 100),
  is_required boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_program_lessons_video_source CHECK (lesson_type <> 'video' OR video_source_type IS NOT NULL),
  CONSTRAINT chk_program_lessons_storage_video CHECK (video_source_type IS NULL OR video_source_type <> 'storage' OR media_storage_path IS NOT NULL),
  CONSTRAINT chk_program_lessons_external_video CHECK (video_source_type IS NULL OR video_source_type <> 'external' OR external_url IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.program_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE CASCADE,
  course_id uuid NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  section_id uuid NULL REFERENCES public.program_sections(id) ON DELETE CASCADE,
  lesson_id uuid NULL REFERENCES public.program_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_type text NOT NULL,
  storage_path text NULL,
  external_url text NULL,
  file_size_bytes bigint NULL CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  is_downloadable boolean NOT NULL DEFAULT true,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_program_resources_target CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'completed', 'withdrawn')),
  enrolled_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_accessed_at timestamptz NULL,
  last_lesson_id uuid NULL REFERENCES public.program_lessons(id) ON DELETE SET NULL,
  CONSTRAINT uq_program_enrollments_program_student UNIQUE (program_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.program_lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_position_seconds integer NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  watched_seconds integer NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at timestamptz NULL,
  last_heartbeat_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_lesson_progress_enrollment_lesson UNIQUE (enrollment_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.program_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  section_id uuid NULL REFERENCES public.program_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  pass_mark_percent numeric(5,2) NOT NULL DEFAULT 70 CHECK (pass_mark_percent BETWEEN 0 AND 100),
  attempts_allowed integer NOT NULL DEFAULT 1 CHECK (attempts_allowed >= 1),
  time_limit_minutes integer NULL CHECK (time_limit_minutes IS NULL OR time_limit_minutes >= 1),
  is_required boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  show_result_immediately boolean NOT NULL DEFAULT true,
  deadline_at timestamptz NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.program_quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  question_text text NOT NULL,
  explanation text,
  points numeric(6,2) NOT NULL DEFAULT 1 CHECK (points > 0),
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.program_quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.program_quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.program_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.program_quizzes(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  submitted_at timestamptz NULL,
  score_points numeric(6,2) NULL,
  max_points numeric(6,2) NULL,
  score_percent numeric(5,2) NULL,
  passed boolean NULL,
  CONSTRAINT uq_program_quiz_attempts_number UNIQUE (quiz_id, enrollment_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.program_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.program_quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.program_quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}',
  is_correct boolean NULL,
  points_awarded numeric(6,2) NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_program_quiz_answers_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.program_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no text UNIQUE NOT NULL,
  verification_token text UNIQUE NOT NULL,
  enrollment_id uuid UNIQUE NOT NULL REFERENCES public.program_enrollments(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  student_name text NOT NULL,
  reg_no text NULL,
  program_title text NOT NULL,
  completion_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at timestamptz NULL,
  revoke_reason text NULL
);

CREATE TABLE IF NOT EXISTS public.program_lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.program_lessons(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_program_lesson_bookmarks_user_lesson UNIQUE (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.program_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.program_courses(id) ON DELETE CASCADE,
  lesson_id uuid NULL REFERENCES public.program_lessons(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid NULL REFERENCES public.program_discussions(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.special_programs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_special_programs_status ON public.special_programs(status);
CREATE INDEX IF NOT EXISTS idx_special_programs_category ON public.special_programs(category);
CREATE INDEX IF NOT EXISTS idx_program_instructors_instructor ON public.program_instructors(instructor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_program_instructors_program ON public.program_instructors(program_id, is_active);
CREATE INDEX IF NOT EXISTS idx_program_courses_program ON public.program_courses(program_id, display_order);
CREATE INDEX IF NOT EXISTS idx_program_courses_instructor ON public.program_courses(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_program_sections_course ON public.program_sections(course_id, display_order);
CREATE INDEX IF NOT EXISTS idx_program_lessons_section ON public.program_lessons(section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_program_lessons_course ON public.program_lessons(course_id, is_published);
CREATE INDEX IF NOT EXISTS idx_program_resources_lookup ON public.program_resources(program_id, course_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_student ON public.program_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON public.program_enrollments(program_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id, status);
CREATE INDEX IF NOT EXISTS idx_program_quizzes_course ON public.program_quizzes(course_id, is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_program_quiz_questions_quiz ON public.program_quiz_questions(quiz_id, display_order);
CREATE INDEX IF NOT EXISTS idx_program_quiz_options_question ON public.program_quiz_options(question_id, display_order);
CREATE INDEX IF NOT EXISTS idx_program_quiz_attempts_student ON public.program_quiz_attempts(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_program_quiz_attempts_enrollment ON public.program_quiz_attempts(enrollment_id, status);
CREATE INDEX IF NOT EXISTS idx_program_certificates_student ON public.program_certificates(student_id, status);
CREATE INDEX IF NOT EXISTS idx_program_certificates_program ON public.program_certificates(program_id, status);
CREATE INDEX IF NOT EXISTS idx_program_discussions_course ON public.program_discussions(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_activity_logs_program ON public.program_activity_logs(program_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_activity_logs_student ON public.program_activity_logs(student_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_special_programs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_program_lesson_course_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  parent_course_id uuid;
BEGIN
  SELECT s.course_id INTO parent_course_id
  FROM public.program_sections s
  WHERE s.id = NEW.section_id;

  IF parent_course_id IS NULL THEN
    RAISE EXCEPTION 'Invalid section_id for program_lessons.';
  END IF;

  NEW.course_id := parent_course_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_program_course_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT public.is_main_admin() THEN
    IF NEW.program_id IS DISTINCT FROM OLD.program_id THEN
      RAISE EXCEPTION 'Only Main Admin can move a course between programs.';
    END IF;
    IF NEW.instructor_id IS DISTINCT FROM OLD.instructor_id THEN
      RAISE EXCEPTION 'Only Main Admin can reassign a course instructor.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_special_programs_updated_at ON public.special_programs;
CREATE TRIGGER trg_special_programs_updated_at BEFORE UPDATE ON public.special_programs FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_program_courses_updated_at ON public.program_courses;
CREATE TRIGGER trg_program_courses_updated_at BEFORE UPDATE ON public.program_courses FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_program_sections_updated_at ON public.program_sections;
CREATE TRIGGER trg_program_sections_updated_at BEFORE UPDATE ON public.program_sections FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_program_lessons_updated_at ON public.program_lessons;
CREATE TRIGGER trg_program_lessons_updated_at BEFORE UPDATE ON public.program_lessons FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_progress_updated_at ON public.lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_program_quizzes_updated_at ON public.program_quizzes;
CREATE TRIGGER trg_program_quizzes_updated_at BEFORE UPDATE ON public.program_quizzes FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_program_quiz_answers_updated_at ON public.program_quiz_answers;
CREATE TRIGGER trg_program_quiz_answers_updated_at BEFORE UPDATE ON public.program_quiz_answers FOR EACH ROW EXECUTE FUNCTION public.set_special_programs_updated_at();

DROP TRIGGER IF EXISTS trg_sync_program_lesson_course_id ON public.program_lessons;
CREATE TRIGGER trg_sync_program_lesson_course_id BEFORE INSERT OR UPDATE OF section_id, course_id ON public.program_lessons FOR EACH ROW EXECUTE FUNCTION public.sync_program_lesson_course_id();

DROP TRIGGER IF EXISTS trg_guard_program_course_ownership ON public.program_courses;
CREATE TRIGGER trg_guard_program_course_ownership BEFORE UPDATE ON public.program_courses FOR EACH ROW EXECUTE FUNCTION public.guard_program_course_ownership();

COMMIT;