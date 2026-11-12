BEGIN;

CREATE OR REPLACE FUNCTION public.try_parse_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_program_lead(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_instructors pi
    JOIN public.profiles p ON p.id = pi.instructor_id
    WHERE pi.program_id = p_program_id
      AND pi.instructor_id = auth.uid()
      AND pi.is_active = true
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_instructor(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_courses pc
    JOIN public.profiles p ON p.id = pc.instructor_id
    WHERE pc.id = p_course_id
      AND pc.instructor_id = auth.uid()
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_program_lead(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_courses pc
    JOIN public.program_instructors pi ON pi.program_id = pc.program_id
    JOIN public.profiles p ON p.id = pi.instructor_id
    WHERE pc.id = p_course_id
      AND pi.instructor_id = auth.uid()
      AND pi.is_active = true
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_student(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_enrollments pe
    JOIN public.profiles p ON p.id = pe.student_id
    WHERE pe.program_id = p_program_id
      AND pe.student_id = auth.uid()
      AND pe.status IN ('active', 'completed')
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_met_course_prerequisites(p_course_id uuid, p_enrollment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.program_course_prerequisites pcp
    WHERE pcp.course_id = p_course_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.program_lessons pl
          WHERE pl.course_id = pcp.prerequisite_course_id
            AND pl.is_published = true
            AND pl.is_required = true
            AND NOT EXISTS (
              SELECT 1
              FROM public.lesson_progress lp
              WHERE lp.enrollment_id = p_enrollment_id
                AND lp.lesson_id = pl.id
                AND lp.status = 'completed'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.program_quizzes pq
          WHERE pq.course_id = pcp.prerequisite_course_id
            AND pq.is_published = true
            AND pq.is_required = true
            AND NOT EXISTS (
              SELECT 1
              FROM public.program_quiz_attempts pqa
              WHERE pqa.enrollment_id = p_enrollment_id
                AND pqa.quiz_id = pq.id
                AND pqa.status = 'submitted'
                AND pqa.passed = true
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_student_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_courses pc
    JOIN public.special_programs sp ON sp.id = pc.program_id
    JOIN public.program_enrollments pe ON pe.program_id = pc.program_id
    JOIN public.profiles p ON p.id = pe.student_id
    WHERE pc.id = p_course_id
      AND pc.status = 'published'
      AND sp.status <> 'draft'
      AND pe.student_id = auth.uid()
      AND pe.status IN ('active', 'completed')
      AND COALESCE(p.is_active, true) = true
      AND public.has_met_course_prerequisites(pc.id, pe.id)
  );
$$;

REVOKE ALL ON FUNCTION public.try_parse_uuid(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_program_lead(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_course_instructor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_course_program_lead(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_enrolled_student(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_met_course_prerequisites(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_student_access_course(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.try_parse_uuid(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_program_lead(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_course_instructor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_course_program_lead(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_enrolled_student(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_met_course_prerequisites(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_student_access_course(uuid) TO authenticated, service_role;

ALTER TABLE public.special_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_lesson_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_activity_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.special_programs,
  public.program_instructors,
  public.program_courses,
  public.program_course_prerequisites,
  public.program_sections,
  public.program_lessons,
  public.program_resources,
  public.program_enrollments,
  public.lesson_progress,
  public.program_quizzes,
  public.program_quiz_questions,
  public.program_quiz_options,
  public.program_quiz_attempts,
  public.program_quiz_answers,
  public.program_certificates,
  public.program_lesson_bookmarks,
  public.program_discussions,
  public.program_activity_logs
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.special_programs,
  public.program_instructors,
  public.program_courses,
  public.program_course_prerequisites,
  public.program_sections,
  public.program_lessons,
  public.program_resources,
  public.program_enrollments,
  public.lesson_progress,
  public.program_quizzes,
  public.program_quiz_questions,
  public.program_quiz_options,
  public.program_quiz_attempts,
  public.program_quiz_answers,
  public.program_certificates,
  public.program_lesson_bookmarks,
  public.program_discussions,
  public.program_activity_logs
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.special_programs,
  public.program_instructors,
  public.program_courses,
  public.program_course_prerequisites,
  public.program_sections,
  public.program_lessons,
  public.program_resources,
  public.program_quizzes,
  public.program_quiz_questions,
  public.program_quiz_options,
  public.program_lesson_bookmarks,
  public.program_discussions
TO authenticated;

GRANT SELECT ON TABLE
  public.program_enrollments,
  public.lesson_progress,
  public.program_quiz_attempts,
  public.program_quiz_answers,
  public.program_certificates,
  public.program_activity_logs
TO authenticated;

-- 1. special_programs
DROP POLICY IF EXISTS sp_select ON public.special_programs;
CREATE POLICY sp_select ON public.special_programs
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_program_lead(id)
    OR EXISTS (
      SELECT 1 FROM public.program_courses pc
      WHERE pc.program_id = special_programs.id
        AND pc.instructor_id = auth.uid()
    )
    OR public.is_enrolled_student(id)
    OR status IN ('published', 'enrollment_open', 'enrollment_closed', 'active', 'completed')
  );

DROP POLICY IF EXISTS sp_insert ON public.special_programs;
CREATE POLICY sp_insert ON public.special_programs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_main_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS sp_update ON public.special_programs;
CREATE POLICY sp_update ON public.special_programs
  FOR UPDATE TO authenticated
  USING (public.is_main_admin())
  WITH CHECK (public.is_main_admin());

DROP POLICY IF EXISTS sp_delete ON public.special_programs;
CREATE POLICY sp_delete ON public.special_programs
  FOR DELETE TO authenticated
  USING (public.is_main_admin());

-- 2. program_instructors
DROP POLICY IF EXISTS pi_select ON public.program_instructors;
CREATE POLICY pi_select ON public.program_instructors
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR instructor_id = auth.uid()
    OR public.is_enrolled_student(program_id)
  );

DROP POLICY IF EXISTS pi_manage ON public.program_instructors;
CREATE POLICY pi_manage ON public.program_instructors
  FOR ALL TO authenticated
  USING (public.is_main_admin())
  WITH CHECK (public.is_main_admin());

-- 3. program_courses
DROP POLICY IF EXISTS pc_select ON public.program_courses;
CREATE POLICY pc_select ON public.program_courses
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR instructor_id = auth.uid()
    OR (
      status = 'published'
      AND (
        public.is_enrolled_student(program_id)
        OR EXISTS (
          SELECT 1 FROM public.special_programs sp
          WHERE sp.id = program_courses.program_id
            AND sp.status IN ('published', 'enrollment_open', 'enrollment_closed', 'active', 'completed')
        )
      )
    )
  );

DROP POLICY IF EXISTS pc_insert ON public.program_courses;
CREATE POLICY pc_insert ON public.program_courses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_main_admin());

DROP POLICY IF EXISTS pc_update ON public.program_courses;
CREATE POLICY pc_update ON public.program_courses
  FOR UPDATE TO authenticated
  USING (public.is_main_admin() OR instructor_id = auth.uid())
  WITH CHECK (public.is_main_admin() OR instructor_id = auth.uid());

DROP POLICY IF EXISTS pc_delete ON public.program_courses;
CREATE POLICY pc_delete ON public.program_courses
  FOR DELETE TO authenticated
  USING (public.is_main_admin());

-- 4. program_course_prerequisites
DROP POLICY IF EXISTS pcp_select ON public.program_course_prerequisites;
CREATE POLICY pcp_select ON public.program_course_prerequisites
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_course_program_lead(course_id)
    OR public.is_course_instructor(course_id)
    OR EXISTS (
      SELECT 1 FROM public.program_courses pc
      WHERE pc.id = program_course_prerequisites.course_id
        AND pc.status = 'published'
        AND public.is_enrolled_student(pc.program_id)
    )
  );

DROP POLICY IF EXISTS pcp_manage ON public.program_course_prerequisites;
CREATE POLICY pcp_manage ON public.program_course_prerequisites
  FOR ALL TO authenticated
  USING (public.is_main_admin())
  WITH CHECK (public.is_main_admin());

-- 5. program_sections
DROP POLICY IF EXISTS ps_select ON public.program_sections;
CREATE POLICY ps_select ON public.program_sections
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_course_program_lead(course_id)
    OR public.is_course_instructor(course_id)
    OR public.can_student_access_course(course_id)
  );

DROP POLICY IF EXISTS ps_manage ON public.program_sections;
CREATE POLICY ps_manage ON public.program_sections
  FOR ALL TO authenticated
  USING (public.is_main_admin() OR public.is_course_instructor(course_id))
  WITH CHECK (public.is_main_admin() OR public.is_course_instructor(course_id));

-- 6. program_lessons
DROP POLICY IF EXISTS pl_select ON public.program_lessons;
CREATE POLICY pl_select ON public.program_lessons
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_course_program_lead(course_id)
    OR public.is_course_instructor(course_id)
    OR (is_published = true AND public.can_student_access_course(course_id))
  );

DROP POLICY IF EXISTS pl_manage ON public.program_lessons;
CREATE POLICY pl_manage ON public.program_lessons
  FOR ALL TO authenticated
  USING (public.is_main_admin() OR public.is_course_instructor(course_id))
  WITH CHECK (public.is_main_admin() OR public.is_course_instructor(course_id));

-- 7. program_resources
DROP POLICY IF EXISTS pr_select ON public.program_resources;
CREATE POLICY pr_select ON public.program_resources
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR (course_id IS NOT NULL AND public.is_course_instructor(course_id))
    OR (
      public.is_enrolled_student(program_id)
      AND (course_id IS NULL OR public.can_student_access_course(course_id))
      AND (
        lesson_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.program_lessons pl
          WHERE pl.id = program_resources.lesson_id
            AND pl.is_published = true
        )
      )
    )
  );

DROP POLICY IF EXISTS pr_manage ON public.program_resources;
CREATE POLICY pr_manage ON public.program_resources
  FOR ALL TO authenticated
  USING (
    public.is_main_admin()
    OR (course_id IS NOT NULL AND public.is_course_instructor(course_id))
  )
  WITH CHECK (
    public.is_main_admin()
    OR (course_id IS NOT NULL AND public.is_course_instructor(course_id) AND uploaded_by = auth.uid())
  );

-- 8. program_enrollments (SELECT only for authenticated; mutations via RPC)
DROP POLICY IF EXISTS pe_select ON public.program_enrollments;
CREATE POLICY pe_select ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.program_courses pc
      WHERE pc.program_id = program_enrollments.program_id
        AND pc.instructor_id = auth.uid()
    )
  );

-- 9. lesson_progress (SELECT only for authenticated; mutations via RPC)
DROP POLICY IF EXISTS lp_select ON public.lesson_progress;
CREATE POLICY lp_select ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.program_lessons pl
      WHERE pl.id = lesson_progress.lesson_id
        AND (public.is_course_instructor(pl.course_id) OR public.is_course_program_lead(pl.course_id))
    )
  );

-- 10. program_quizzes
DROP POLICY IF EXISTS pq_select ON public.program_quizzes;
CREATE POLICY pq_select ON public.program_quizzes
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_course_program_lead(course_id)
    OR public.is_course_instructor(course_id)
    OR (is_published = true AND public.can_student_access_course(course_id))
  );

DROP POLICY IF EXISTS pq_manage ON public.program_quizzes;
CREATE POLICY pq_manage ON public.program_quizzes
  FOR ALL TO authenticated
  USING (public.is_main_admin() OR public.is_course_instructor(course_id))
  WITH CHECK (public.is_main_admin() OR public.is_course_instructor(course_id));

-- 11. program_quiz_questions
DROP POLICY IF EXISTS pqq_select ON public.program_quiz_questions;
CREATE POLICY pqq_select ON public.program_quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_quizzes pq
      WHERE pq.id = program_quiz_questions.quiz_id
        AND (
          public.is_main_admin()
          OR public.is_course_program_lead(pq.course_id)
          OR public.is_course_instructor(pq.course_id)
          OR (pq.is_published = true AND public.can_student_access_course(pq.course_id))
        )
    )
  );

DROP POLICY IF EXISTS pqq_manage ON public.program_quiz_questions;
CREATE POLICY pqq_manage ON public.program_quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_quizzes pq
      WHERE pq.id = program_quiz_questions.quiz_id
        AND (public.is_main_admin() OR public.is_course_instructor(pq.course_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_quizzes pq
      WHERE pq.id = program_quiz_questions.quiz_id
        AND (public.is_main_admin() OR public.is_course_instructor(pq.course_id))
    )
  );

-- 12. program_quiz_options (Instructors/Leads/Admin ONLY; students blocked from direct SELECT)
DROP POLICY IF EXISTS pqo_select_staff ON public.program_quiz_options;
CREATE POLICY pqo_select_staff ON public.program_quiz_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_quiz_questions pqq
      JOIN public.program_quizzes pq ON pq.id = pqq.quiz_id
      WHERE pqq.id = program_quiz_options.question_id
        AND (
          public.is_main_admin()
          OR public.is_course_program_lead(pq.course_id)
          OR public.is_course_instructor(pq.course_id)
        )
    )
  );

DROP POLICY IF EXISTS pqo_manage_staff ON public.program_quiz_options;
CREATE POLICY pqo_manage_staff ON public.program_quiz_options
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_quiz_questions pqq
      JOIN public.program_quizzes pq ON pq.id = pqq.quiz_id
      WHERE pqq.id = program_quiz_options.question_id
        AND (public.is_main_admin() OR public.is_course_instructor(pq.course_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_quiz_questions pqq
      JOIN public.program_quizzes pq ON pq.id = pqq.quiz_id
      WHERE pqq.id = program_quiz_options.question_id
        AND (public.is_main_admin() OR public.is_course_instructor(pq.course_id))
    )
  );

-- 13. program_quiz_attempts (SELECT only for authenticated; mutations via RPC)
DROP POLICY IF EXISTS pqa_select ON public.program_quiz_attempts;
CREATE POLICY pqa_select ON public.program_quiz_attempts
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.program_quizzes pq
      WHERE pq.id = program_quiz_attempts.quiz_id
        AND (public.is_course_instructor(pq.course_id) OR public.is_course_program_lead(pq.course_id))
    )
  );

-- 14. program_quiz_answers (SELECT only for authenticated; mutations via RPC)
DROP POLICY IF EXISTS pqans_select ON public.program_quiz_answers;
CREATE POLICY pqans_select ON public.program_quiz_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_quiz_attempts pqa
      JOIN public.program_quizzes pq ON pq.id = pqa.quiz_id
      WHERE pqa.id = program_quiz_answers.attempt_id
        AND (
          public.is_main_admin()
          OR pqa.student_id = auth.uid()
          OR public.is_course_instructor(pq.course_id)
          OR public.is_course_program_lead(pq.course_id)
        )
    )
  );

-- 15. program_certificates (SELECT only for authenticated; issuance/revocation via RPC)
DROP POLICY IF EXISTS pcert_select ON public.program_certificates;
CREATE POLICY pcert_select ON public.program_certificates
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR student_id = auth.uid()
    OR public.is_program_lead(program_id)
  );

-- 16. program_lesson_bookmarks
DROP POLICY IF EXISTS plb_manage_own ON public.program_lesson_bookmarks;
CREATE POLICY plb_manage_own ON public.program_lesson_bookmarks
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- 17. program_discussions
DROP POLICY IF EXISTS pdisc_select ON public.program_discussions;
CREATE POLICY pdisc_select ON public.program_discussions
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR public.is_course_instructor(course_id)
    OR public.is_enrolled_student(program_id)
  );

DROP POLICY IF EXISTS pdisc_insert ON public.program_discussions;
CREATE POLICY pdisc_insert ON public.program_discussions
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_main_admin()
      OR public.is_program_lead(program_id)
      OR public.is_course_instructor(course_id)
      OR public.is_enrolled_student(program_id)
    )
  );

DROP POLICY IF EXISTS pdisc_update ON public.program_discussions;
CREATE POLICY pdisc_update ON public.program_discussions
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR public.is_course_instructor(course_id)
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR public.is_course_instructor(course_id)
  );

DROP POLICY IF EXISTS pdisc_delete ON public.program_discussions;
CREATE POLICY pdisc_delete ON public.program_discussions
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_main_admin()
    OR public.is_program_lead(program_id)
    OR public.is_course_instructor(course_id)
  );

-- 18. program_activity_logs (SELECT only for authenticated; inserts via RPC)
DROP POLICY IF EXISTS pal_select ON public.program_activity_logs;
CREATE POLICY pal_select ON public.program_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.is_main_admin()
    OR student_id = auth.uid()
    OR public.is_program_lead(program_id)
  );

-- 19. Private Storage Bucket: special-program-assets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('special-program-assets', 'special-program-assets', false, 524288000)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS sp_assets_select ON storage.objects;
CREATE POLICY sp_assets_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'special-program-assets'
    AND (
      public.is_main_admin()
      OR (
        public.try_parse_uuid((storage.foldername(name))[1]) IS NOT NULL
        AND (
          public.is_program_lead(public.try_parse_uuid((storage.foldername(name))[1]))
          OR (
            (storage.foldername(name))[2] = 'cover'
            AND EXISTS (
              SELECT 1 FROM public.special_programs sp
              WHERE sp.id = public.try_parse_uuid((storage.foldername(name))[1])
                AND sp.status <> 'draft'
            )
          )
          OR (
            public.try_parse_uuid((storage.foldername(name))[2]) IS NOT NULL
            AND (
              public.is_course_instructor(public.try_parse_uuid((storage.foldername(name))[2]))
              OR (
                public.is_enrolled_student(public.try_parse_uuid((storage.foldername(name))[1]))
                AND public.can_student_access_course(public.try_parse_uuid((storage.foldername(name))[2]))
              )
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS sp_assets_insert ON storage.objects;
CREATE POLICY sp_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'special-program-assets'
    AND (
      public.is_main_admin()
      OR (
        public.try_parse_uuid((storage.foldername(name))[2]) IS NOT NULL
        AND public.is_course_instructor(public.try_parse_uuid((storage.foldername(name))[2]))
      )
    )
  );

DROP POLICY IF EXISTS sp_assets_update ON storage.objects;
CREATE POLICY sp_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'special-program-assets'
    AND (
      public.is_main_admin()
      OR (
        public.try_parse_uuid((storage.foldername(name))[2]) IS NOT NULL
        AND public.is_course_instructor(public.try_parse_uuid((storage.foldername(name))[2]))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'special-program-assets'
    AND (
      public.is_main_admin()
      OR (
        public.try_parse_uuid((storage.foldername(name))[2]) IS NOT NULL
        AND public.is_course_instructor(public.try_parse_uuid((storage.foldername(name))[2]))
      )
    )
  );

DROP POLICY IF EXISTS sp_assets_delete ON storage.objects;
CREATE POLICY sp_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'special-program-assets'
    AND (
      public.is_main_admin()
      OR (
        public.try_parse_uuid((storage.foldername(name))[2]) IS NOT NULL
        AND public.is_course_instructor(public.try_parse_uuid((storage.foldername(name))[2]))
      )
    )
  );

COMMIT;