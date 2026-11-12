BEGIN;

-- 1. Program Lifecycle State Machine (Main Admin only)
CREATE OR REPLACE FUNCTION public.transition_program_status(
  p_program_id uuid,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_program public.special_programs%ROWTYPE;
  v_allowed boolean := false;
BEGIN
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Only Main Admin can transition program status.';
  END IF;

  SELECT * INTO v_program
  FROM public.special_programs
  WHERE id = p_program_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Special program not found.';
  END IF;

  IF v_program.status = p_new_status THEN
    RETURN to_jsonb(v_program);
  END IF;

  v_allowed := CASE v_program.status
    WHEN 'draft' THEN p_new_status IN ('published', 'archived')
    WHEN 'published' THEN p_new_status IN ('enrollment_open', 'active', 'draft', 'archived')
    WHEN 'enrollment_open' THEN p_new_status IN ('enrollment_closed', 'active', 'archived')
    WHEN 'enrollment_closed' THEN p_new_status IN ('enrollment_open', 'active', 'completed', 'archived')
    WHEN 'active' THEN p_new_status IN ('enrollment_open', 'enrollment_closed', 'completed', 'archived')
    WHEN 'completed' THEN p_new_status IN ('archived')
    WHEN 'archived' THEN p_new_status IN ('draft')
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition from % to %.', v_program.status, p_new_status;
  END IF;

  UPDATE public.special_programs
  SET status = p_new_status
  WHERE id = p_program_id
  RETURNING * INTO v_program;

  INSERT INTO public.admin_audit_logs (actor_id, action, target_table, details)
  VALUES (
    auth.uid(),
    'transition_program_status',
    'special_programs',
    jsonb_build_object('program_id', p_program_id, 'new_status', p_new_status)
  );

  RETURN to_jsonb(v_program);
END;
$$;

-- 2. Program Enrollment Management (Admin + Eligible Student Self-Enrollment)
CREATE OR REPLACE FUNCTION public.manage_program_enrollment(
  p_program_id uuid,
  p_student_id uuid DEFAULT NULL,
  p_action text DEFAULT 'enroll'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_admin boolean := public.is_main_admin();
  v_target_student uuid;
  v_program public.special_programs%ROWTYPE;
  v_student public.profiles%ROWTYPE;
  v_existing public.program_enrollments%ROWTYPE;
  v_active_count integer;
  v_initial_status text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_target_student := COALESCE(p_student_id, v_caller_id);

  IF NOT v_is_admin THEN
    IF v_target_student <> v_caller_id THEN
      RAISE EXCEPTION 'Students may only manage their own enrollment.';
    END IF;
    IF p_action NOT IN ('enroll', 'withdraw') THEN
      RAISE EXCEPTION 'Action % requires Main Admin authorization.', p_action;
    END IF;
  END IF;

  SELECT * INTO v_program
  FROM public.special_programs
  WHERE id = p_program_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Special program not found.';
  END IF;

  SELECT * INTO v_student
  FROM public.profiles
  WHERE id = v_target_student;

  IF NOT FOUND OR COALESCE(v_student.is_active, true) = false THEN
    RAISE EXCEPTION 'Target user account is missing or inactive.';
  END IF;

  SELECT * INTO v_existing
  FROM public.program_enrollments
  WHERE program_id = p_program_id
    AND student_id = v_target_student
  FOR UPDATE;

  IF p_action = 'enroll' THEN
    IF FOUND AND v_existing.status IN ('pending', 'active', 'completed') THEN
      RAISE EXCEPTION 'Student is already enrolled in this program (status: %).', v_existing.status;
    END IF;

    IF FOUND AND v_existing.status = 'suspended' AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Suspended enrollment can only be reinstated by Main Admin.';
    END IF;

    IF NOT v_is_admin THEN
      IF v_program.status <> 'enrollment_open' THEN
        RAISE EXCEPTION 'Enrollment is not currently open for this program.';
      END IF;

      IF v_program.enrollment_mode = 'admin_only' THEN
        RAISE EXCEPTION 'Enrollment for this program is restricted to administrator assignment.';
      END IF;

      IF v_program.enrollment_opens_at IS NOT NULL AND now() < v_program.enrollment_opens_at THEN
        RAISE EXCEPTION 'Enrollment window has not opened yet.';
      END IF;

      IF v_program.enrollment_closes_at IS NOT NULL AND now() > v_program.enrollment_closes_at THEN
        RAISE EXCEPTION 'Enrollment deadline has passed.';
      END IF;

      IF v_program.eligible_level_ids IS NOT NULL AND cardinality(v_program.eligible_level_ids) > 0 THEN
        IF v_student.level_id IS NULL OR NOT (v_student.level_id::text = ANY(v_program.eligible_level_ids)) THEN
          RAISE EXCEPTION 'Your current academic level is not eligible for this program.';
        END IF;
      END IF;
    END IF;

    IF v_program.max_enrollments IS NOT NULL THEN
      SELECT COUNT(*) INTO v_active_count
      FROM public.program_enrollments
      WHERE program_id = p_program_id
        AND status IN ('pending', 'active', 'completed');

      IF v_active_count >= v_program.max_enrollments THEN
        RAISE EXCEPTION 'This program has reached its maximum enrollment capacity.';
      END IF;
    END IF;

    v_initial_status := CASE
      WHEN v_is_admin THEN 'active'
      WHEN v_program.enrollment_mode = 'approval_required' THEN 'pending'
      ELSE 'active'
    END;

    IF FOUND THEN
      UPDATE public.program_enrollments
      SET status = v_initial_status,
          enrolled_by = v_caller_id,
          enrolled_at = now()
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    ELSE
      INSERT INTO public.program_enrollments (
        program_id, student_id, status, enrolled_by, enrolled_at
      )
      VALUES (
        p_program_id, v_target_student, v_initial_status, v_caller_id, now()
      )
      RETURNING * INTO v_existing;
    END IF;

    INSERT INTO public.program_activity_logs (enrollment_id, student_id, program_id, event_type, metadata)
    VALUES (
      v_existing.id,
      v_target_student,
      p_program_id,
      'program_enrolled',
      jsonb_build_object('status', v_initial_status, 'enrolled_by', v_caller_id)
    );

  ELSIF p_action = 'approve' THEN
    IF NOT FOUND OR v_existing.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending enrollments can be approved.';
    END IF;
    UPDATE public.program_enrollments
    SET status = 'active'
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

  ELSIF p_action = 'suspend' THEN
    IF NOT FOUND OR v_existing.status NOT IN ('active', 'pending') THEN
      RAISE EXCEPTION 'Only active or pending enrollments can be suspended.';
    END IF;
    UPDATE public.program_enrollments
    SET status = 'suspended'
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

  ELSIF p_action = 'reactivate' THEN
    IF NOT FOUND OR v_existing.status NOT IN ('suspended', 'withdrawn') THEN
      RAISE EXCEPTION 'Only suspended or withdrawn enrollments can be reactivated.';
    END IF;
    UPDATE public.program_enrollments
    SET status = 'active'
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

  ELSIF p_action = 'withdraw' THEN
    IF NOT FOUND OR v_existing.status NOT IN ('active', 'pending') THEN
      RAISE EXCEPTION 'Only active or pending enrollments can be withdrawn.';
    END IF;
    UPDATE public.program_enrollments
    SET status = 'withdrawn'
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

  ELSE
    RAISE EXCEPTION 'Unsupported enrollment action: %.', p_action;
  END IF;

  IF v_is_admin THEN
    INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
    VALUES (
      v_caller_id,
      'program_enrollment_' || p_action,
      'program_enrollments',
      v_target_student,
      jsonb_build_object('program_id', p_program_id, 'enrollment_id', v_existing.id)
    );
  END IF;

  RETURN to_jsonb(v_existing);
END;
$$;

-- 3. Program Progress Calculation & Automatic Certificate Issuance
CREATE OR REPLACE FUNCTION public.evaluate_program_completion_and_certificate(
  p_enrollment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_enrollment public.program_enrollments%ROWTYPE;
  v_program public.special_programs%ROWTYPE;
  v_student public.profiles%ROWTYPE;
  v_cert public.program_certificates%ROWTYPE;
  v_total_req_lessons integer := 0;
  v_done_req_lessons integer := 0;
  v_total_req_quizzes integer := 0;
  v_done_req_quizzes integer := 0;
  v_total_items integer := 0;
  v_progress numeric(5,2) := 0;
  v_avg_quiz_score numeric(5,2) := 100;
  v_req_lessons_rule boolean;
  v_req_quizzes_rule boolean;
  v_min_avg_rule numeric(5,2);
  v_is_completed boolean := false;
  v_cert_no text;
  v_verify_token text;
BEGIN
  SELECT * INTO v_enrollment
  FROM public.program_enrollments
  WHERE id = p_enrollment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment record not found.';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_main_admin()
     AND NOT public.is_program_lead(v_enrollment.program_id)
     AND v_enrollment.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to evaluate this enrollment.';
  END IF;

  SELECT * INTO v_program
  FROM public.special_programs
  WHERE id = v_enrollment.program_id;

  SELECT COUNT(*) INTO v_total_req_lessons
  FROM public.program_lessons pl
  JOIN public.program_courses pc ON pc.id = pl.course_id
  WHERE pc.program_id = v_enrollment.program_id
    AND pc.status = 'published'
    AND pl.is_published = true
    AND pl.is_required = true;

  SELECT COUNT(*) INTO v_done_req_lessons
  FROM public.program_lessons pl
  JOIN public.program_courses pc ON pc.id = pl.course_id
  JOIN public.lesson_progress lp ON lp.lesson_id = pl.id AND lp.enrollment_id = v_enrollment.id
  WHERE pc.program_id = v_enrollment.program_id
    AND pc.status = 'published'
    AND pl.is_published = true
    AND pl.is_required = true
    AND lp.status = 'completed';

  SELECT COUNT(*) INTO v_total_req_quizzes
  FROM public.program_quizzes pq
  JOIN public.program_courses pc ON pc.id = pq.course_id
  WHERE pc.program_id = v_enrollment.program_id
    AND pc.status = 'published'
    AND pq.is_published = true
    AND pq.is_required = true;

  SELECT COUNT(*) INTO v_done_req_quizzes
  FROM public.program_quizzes pq
  JOIN public.program_courses pc ON pc.id = pq.course_id
  WHERE pc.program_id = v_enrollment.program_id
    AND pc.status = 'published'
    AND pq.is_published = true
    AND pq.is_required = true
    AND EXISTS (
      SELECT 1
      FROM public.program_quiz_attempts pqa
      WHERE pqa.enrollment_id = v_enrollment.id
        AND pqa.quiz_id = pq.id
        AND pqa.status = 'submitted'
        AND pqa.passed = true
    );

  v_total_items := v_total_req_lessons + v_total_req_quizzes;

  IF v_total_items > 0 THEN
    v_progress := ROUND(((v_done_req_lessons + v_done_req_quizzes)::numeric / v_total_items::numeric) * 100, 2);
  ELSE
    v_progress := 0;
  END IF;

  IF v_total_req_quizzes > 0 THEN
    SELECT COALESCE(AVG(best_scores.max_score), 0) INTO v_avg_quiz_score
    FROM (
      SELECT pq.id, COALESCE(MAX(pqa.score_percent), 0) AS max_score
      FROM public.program_quizzes pq
      JOIN public.program_courses pc ON pc.id = pq.course_id
      LEFT JOIN public.program_quiz_attempts pqa
        ON pqa.quiz_id = pq.id
       AND pqa.enrollment_id = v_enrollment.id
       AND pqa.status = 'submitted'
      WHERE pc.program_id = v_enrollment.program_id
        AND pc.status = 'published'
        AND pq.is_published = true
        AND pq.is_required = true
      GROUP BY pq.id
    ) AS best_scores;
  END IF;

  v_req_lessons_rule := COALESCE((v_program.completion_rules->>'require_all_required_lessons')::boolean, true);
  v_req_quizzes_rule := COALESCE((v_program.completion_rules->>'require_all_required_quizzes')::boolean, true);
  v_min_avg_rule := COALESCE((v_program.completion_rules->>'min_average_score')::numeric, 0);

  v_is_completed := (
    v_total_items > 0
    AND v_enrollment.status IN ('active', 'completed')
    AND (NOT v_req_lessons_rule OR v_done_req_lessons >= v_total_req_lessons)
    AND (NOT v_req_quizzes_rule OR v_done_req_quizzes >= v_total_req_quizzes)
    AND (v_total_req_quizzes = 0 OR v_avg_quiz_score >= v_min_avg_rule)
  );

  IF v_is_completed THEN
    UPDATE public.program_enrollments
    SET status = 'completed',
        completed_at = COALESCE(completed_at, now()),
        progress_percent = 100
    WHERE id = v_enrollment.id
    RETURNING * INTO v_enrollment;

    IF v_program.certificate_enabled THEN
      SELECT * INTO v_cert
      FROM public.program_certificates
      WHERE enrollment_id = v_enrollment.id;

      IF NOT FOUND THEN
        SELECT * INTO v_student
        FROM public.profiles
        WHERE id = v_enrollment.student_id;

        v_cert_no := 'INT-SP-' || EXTRACT(YEAR FROM now())::text || '-' ||
                     UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10));
        v_verify_token := 'SP-VERIFY-' ||
                          UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));

        INSERT INTO public.program_certificates (
          certificate_no,
          verification_token,
          enrollment_id,
          program_id,
          student_id,
          student_name,
          reg_no,
          program_title,
          completion_snapshot,
          status,
          issued_at
        )
        VALUES (
          v_cert_no,
          v_verify_token,
          v_enrollment.id,
          v_program.id,
          v_enrollment.student_id,
          v_student.name,
          v_student.reg_no,
          v_program.title,
          jsonb_build_object(
            'completed_lessons', v_done_req_lessons,
            'total_required_lessons', v_total_req_lessons,
            'passed_quizzes', v_done_req_quizzes,
            'total_required_quizzes', v_total_req_quizzes,
            'average_quiz_score', v_avg_quiz_score
          ),
          'valid',
          now()
        )
        RETURNING * INTO v_cert;

        INSERT INTO public.program_activity_logs (
          enrollment_id, student_id, program_id, event_type, entity_id, metadata
        )
        VALUES (
          v_enrollment.id,
          v_enrollment.student_id,
          v_program.id,
          'certificate_issued',
          v_cert.id,
          jsonb_build_object('certificate_no', v_cert.certificate_no)
        );
      END IF;
    END IF;
  ELSE
    UPDATE public.program_enrollments
    SET progress_percent = v_progress
    WHERE id = v_enrollment.id
    RETURNING * INTO v_enrollment;
  END IF;

  RETURN jsonb_build_object(
    'enrollment', to_jsonb(v_enrollment),
    'certificate', CASE WHEN v_cert.id IS NOT NULL THEN to_jsonb(v_cert) ELSE NULL END
  );
END;
$$;

-- 4. Server-Validated Lesson Progress & Anti-Spoofing Heartbeat
CREATE OR REPLACE FUNCTION public.record_lesson_progress_secure(
  p_lesson_id uuid,
  p_position_seconds integer DEFAULT 0,
  p_delta_seconds integer DEFAULT 0,
  p_mark_complete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_lesson public.program_lessons%ROWTYPE;
  v_course public.program_courses%ROWTYPE;
  v_program public.special_programs%ROWTYPE;
  v_enrollment public.program_enrollments%ROWTYPE;
  v_progress public.lesson_progress%ROWTYPE;
  v_elapsed integer;
  v_safe_delta integer;
  v_new_watched integer;
  v_new_pos integer;
  v_req_seconds integer;
  v_new_pct numeric(5,2);
  v_new_status text;
  v_was_completed boolean := false;
  v_eval jsonb;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_lesson
  FROM public.program_lessons
  WHERE id = p_lesson_id;

  IF NOT FOUND OR NOT v_lesson.is_published THEN
    RAISE EXCEPTION 'Lesson not found or not published.';
  END IF;

  SELECT * INTO v_course
  FROM public.program_courses
  WHERE id = v_lesson.course_id;

  IF NOT FOUND OR v_course.status <> 'published' THEN
    RAISE EXCEPTION 'Course is not published.';
  END IF;

  SELECT * INTO v_program
  FROM public.special_programs
  WHERE id = v_course.program_id;

  IF v_program.status = 'draft' OR v_program.status = 'archived' THEN
    RAISE EXCEPTION 'Program is not accessible.';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.program_enrollments
  WHERE program_id = v_program.id
    AND student_id = v_student_id
    AND status IN ('active', 'completed')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active enrollment in this program is required.';
  END IF;

  IF NOT public.has_met_course_prerequisites(v_course.id, v_enrollment.id) THEN
    RAISE EXCEPTION 'Course prerequisites have not been completed.';
  END IF;

  IF p_mark_complete AND NOT v_program.is_self_paced THEN
    IF v_program.ends_at IS NOT NULL AND now() > v_program.ends_at THEN
      RAISE EXCEPTION 'Program deadline has passed.';
    END IF;
    IF v_course.deadline_at IS NOT NULL AND now() > v_course.deadline_at THEN
      RAISE EXCEPTION 'Course deadline has passed.';
    END IF;
  END IF;

  SELECT * INTO v_progress
  FROM public.lesson_progress
  WHERE enrollment_id = v_enrollment.id
    AND lesson_id = p_lesson_id
  FOR UPDATE;

  v_was_completed := COALESCE(v_progress.status = 'completed', false);

  IF NOT FOUND THEN
    v_safe_delta := LEAST(GREATEST(COALESCE(p_delta_seconds, 0), 0), 30);
    v_new_watched := v_safe_delta;
  ELSE
    IF v_progress.last_heartbeat_at IS NULL THEN
      v_safe_delta := LEAST(GREATEST(COALESCE(p_delta_seconds, 0), 0), 30);
    ELSE
      v_elapsed := GREATEST(EXTRACT(EPOCH FROM (now() - v_progress.last_heartbeat_at))::integer + 5, 0);
      v_safe_delta := LEAST(GREATEST(COALESCE(p_delta_seconds, 0), 0), v_elapsed, 120);
    END IF;
    v_new_watched := v_progress.watched_seconds + v_safe_delta;
  END IF;

  v_new_pos := GREATEST(COALESCE(p_position_seconds, 0), 0);

  IF v_lesson.lesson_type = 'video' AND v_lesson.duration_seconds > 0 THEN
    v_req_seconds := GREATEST(CEIL((v_lesson.duration_seconds * v_lesson.min_watch_percent)::numeric / 100.0)::integer, 1);

    IF v_was_completed OR v_new_watched >= v_req_seconds THEN
      v_new_pct := 100;
      v_new_status := 'completed';
    ELSE
      IF p_mark_complete THEN
        RAISE EXCEPTION 'Video watch requirement not yet satisfied (% of % required seconds watched).', v_new_watched, v_req_seconds;
      END IF;
      v_new_pct := LEAST(99, ROUND((v_new_watched::numeric / v_req_seconds::numeric) * 100, 2));
      v_new_status := 'in_progress';
    END IF;
  ELSE
    IF v_was_completed OR p_mark_complete THEN
      v_new_pct := 100;
      v_new_status := 'completed';
    ELSE
      v_new_pct := GREATEST(COALESCE(v_progress.progress_percent, 0), 50);
      v_new_status := 'in_progress';
    END IF;
  END IF;

  INSERT INTO public.lesson_progress (
    enrollment_id,
    lesson_id,
    student_id,
    status,
    last_position_seconds,
    watched_seconds,
    progress_percent,
    completed_at,
    last_heartbeat_at
  )
  VALUES (
    v_enrollment.id,
    p_lesson_id,
    v_student_id,
    v_new_status,
    v_new_pos,
    v_new_watched,
    v_new_pct,
    CASE WHEN v_new_status = 'completed' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (enrollment_id, lesson_id) DO UPDATE
  SET status = EXCLUDED.status,
      last_position_seconds = EXCLUDED.last_position_seconds,
      watched_seconds = EXCLUDED.watched_seconds,
      progress_percent = EXCLUDED.progress_percent,
      completed_at = COALESCE(public.lesson_progress.completed_at, EXCLUDED.completed_at),
      last_heartbeat_at = now()
  RETURNING * INTO v_progress;

  UPDATE public.program_enrollments
  SET last_accessed_at = now(),
      last_lesson_id = p_lesson_id
  WHERE id = v_enrollment.id;

  IF NOT v_was_completed AND v_progress.status = 'completed' THEN
    INSERT INTO public.program_activity_logs (
      enrollment_id, student_id, program_id, event_type, entity_id, metadata
    )
    VALUES (
      v_enrollment.id,
      v_student_id,
      v_program.id,
      'lesson_completed',
      p_lesson_id,
      jsonb_build_object('watched_seconds', v_progress.watched_seconds)
    );
  END IF;

  v_eval := public.evaluate_program_completion_and_certificate(v_enrollment.id);

  RETURN jsonb_build_object(
    'lesson_progress', to_jsonb(v_progress),
    'evaluation', v_eval
  );
END;
$$;

-- 5. Atomic Quiz Creation & Safe Metadata Update
CREATE OR REPLACE FUNCTION public.save_program_quiz_atomic(
  p_quiz jsonb,
  p_questions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_quiz_id uuid := public.try_parse_uuid(p_quiz->>'id');
  v_course_id uuid := public.try_parse_uuid(p_quiz->>'course_id');
  v_section_id uuid := public.try_parse_uuid(p_quiz->>'section_id');
  v_settings_only boolean := COALESCE((p_quiz->>'settings_only')::boolean, false);
  v_quiz public.program_quizzes%ROWTYPE;
  v_q jsonb;
  v_opt jsonb;
  v_q_row public.program_quiz_questions%ROWTYPE;
  v_q_idx integer := 0;
  v_opt_idx integer;
  v_correct_count integer;
  v_attempt_count integer := 0;
BEGIN
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'course_id is required.';
  END IF;

  IF NOT (public.is_main_admin() OR public.is_course_instructor(v_course_id)) THEN
    RAISE EXCEPTION 'Not authorized to manage quizzes for this course.';
  END IF;

  IF btrim(COALESCE(p_quiz->>'title', '')) = '' THEN
    RAISE EXCEPTION 'Quiz title is required.';
  END IF;

  IF v_quiz_id IS NOT NULL THEN
    SELECT * INTO v_quiz
    FROM public.program_quizzes
    WHERE id = v_quiz_id
      AND course_id = v_course_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quiz not found in the specified course.';
    END IF;

    SELECT COUNT(*) INTO v_attempt_count
    FROM public.program_quiz_attempts
    WHERE quiz_id = v_quiz_id;

    UPDATE public.program_quizzes
    SET section_id = v_section_id,
        title = btrim(p_quiz->>'title'),
        description = NULLIF(btrim(COALESCE(p_quiz->>'description', '')), ''),
        pass_mark_percent = COALESCE((p_quiz->>'pass_mark_percent')::numeric, v_quiz.pass_mark_percent),
        attempts_allowed = COALESCE((p_quiz->>'attempts_allowed')::integer, v_quiz.attempts_allowed),
        time_limit_minutes = CASE
          WHEN p_quiz ? 'time_limit_minutes' AND NULLIF(p_quiz->>'time_limit_minutes', '') IS NOT NULL
            THEN (p_quiz->>'time_limit_minutes')::integer
          ELSE NULL
        END,
        is_required = COALESCE((p_quiz->>'is_required')::boolean, v_quiz.is_required),
        is_published = COALESCE((p_quiz->>'is_published')::boolean, v_quiz.is_published),
        show_result_immediately = COALESCE((p_quiz->>'show_result_immediately')::boolean, v_quiz.show_result_immediately),
        deadline_at = CASE
          WHEN p_quiz ? 'deadline_at' AND NULLIF(p_quiz->>'deadline_at', '') IS NOT NULL
            THEN (p_quiz->>'deadline_at')::timestamptz
          ELSE NULL
        END,
        display_order = COALESCE((p_quiz->>'display_order')::integer, v_quiz.display_order)
    WHERE id = v_quiz_id
    RETURNING * INTO v_quiz;

    IF v_settings_only THEN
      RETURN to_jsonb(v_quiz);
    END IF;

    IF v_attempt_count > 0 THEN
      RAISE EXCEPTION 'Cannot replace questions on a quiz that already has student attempts. Update quiz settings only or create a new quiz.';
    END IF;

    DELETE FROM public.program_quiz_questions WHERE quiz_id = v_quiz_id;
  ELSE
    INSERT INTO public.program_quizzes (
      course_id,
      section_id,
      title,
      description,
      pass_mark_percent,
      attempts_allowed,
      time_limit_minutes,
      is_required,
      is_published,
      show_result_immediately,
      deadline_at,
      display_order
    )
    VALUES (
      v_course_id,
      v_section_id,
      btrim(p_quiz->>'title'),
      NULLIF(btrim(COALESCE(p_quiz->>'description', '')), ''),
      COALESCE((p_quiz->>'pass_mark_percent')::numeric, 70),
      COALESCE((p_quiz->>'attempts_allowed')::integer, 1),
      CASE
        WHEN p_quiz ? 'time_limit_minutes' AND NULLIF(p_quiz->>'time_limit_minutes', '') IS NOT NULL
          THEN (p_quiz->>'time_limit_minutes')::integer
        ELSE NULL
      END,
      COALESCE((p_quiz->>'is_required')::boolean, true),
      COALESCE((p_quiz->>'is_published')::boolean, false),
      COALESCE((p_quiz->>'show_result_immediately')::boolean, true),
      CASE
        WHEN p_quiz ? 'deadline_at' AND NULLIF(p_quiz->>'deadline_at', '') IS NOT NULL
          THEN (p_quiz->>'deadline_at')::timestamptz
        ELSE NULL
      END,
      COALESCE((p_quiz->>'display_order')::integer, 0)
    )
    RETURNING * INTO v_quiz;
  END IF;

  IF p_questions IS NULL OR jsonb_typeof(p_questions) <> 'array' OR jsonb_array_length(p_questions) = 0 THEN
    RAISE EXCEPTION 'At least one question is required.';
  END IF;

  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    v_q_idx := v_q_idx + 1;

    IF btrim(COALESCE(v_q->>'question_text', '')) = '' THEN
      RAISE EXCEPTION 'Question % text is required.', v_q_idx;
    END IF;

    IF (v_q->>'question_type') NOT IN ('single_choice', 'multiple_choice', 'true_false') THEN
      RAISE EXCEPTION 'Invalid question_type on question %.', v_q_idx;
    END IF;

    IF (v_q->'options') IS NULL OR jsonb_typeof(v_q->'options') <> 'array' OR jsonb_array_length(v_q->'options') < 2 THEN
      RAISE EXCEPTION 'Question % must have at least 2 options.', v_q_idx;
    END IF;

    SELECT COUNT(*) INTO v_correct_count
    FROM jsonb_array_elements(v_q->'options') AS opt
    WHERE COALESCE((opt->>'is_correct')::boolean, false) = true;

    IF (v_q->>'question_type') IN ('single_choice', 'true_false') AND v_correct_count <> 1 THEN
      RAISE EXCEPTION 'Question % must have exactly 1 correct option.', v_q_idx;
    ELSIF (v_q->>'question_type') = 'multiple_choice' AND v_correct_count < 1 THEN
      RAISE EXCEPTION 'Multiple-choice question % must have at least 1 correct option.', v_q_idx;
    END IF;

    INSERT INTO public.program_quiz_questions (
      quiz_id,
      question_type,
      question_text,
      explanation,
      points,
      display_order
    )
    VALUES (
      v_quiz.id,
      v_q->>'question_type',
      btrim(v_q->>'question_text'),
      NULLIF(btrim(COALESCE(v_q->>'explanation', '')), ''),
      COALESCE((v_q->>'points')::numeric, 1),
      COALESCE((v_q->>'display_order')::integer, v_q_idx)
    )
    RETURNING * INTO v_q_row;

    v_opt_idx := 0;
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_q->'options')
    LOOP
      v_opt_idx := v_opt_idx + 1;

      IF btrim(COALESCE(v_opt->>'option_text', '')) = '' THEN
        RAISE EXCEPTION 'Option % on question % cannot be empty.', v_opt_idx, v_q_idx;
      END IF;

      INSERT INTO public.program_quiz_options (
        question_id,
        option_text,
        is_correct,
        display_order
      )
      VALUES (
        v_q_row.id,
        btrim(v_opt->>'option_text'),
        COALESCE((v_opt->>'is_correct')::boolean, false),
        COALESCE((v_opt->>'display_order')::integer, v_opt_idx)
      );
    END LOOP;
  END LOOP;

  RETURN to_jsonb(v_quiz);
END;
$$;

-- 6. Start Quiz Attempt (Enforces Enrollment, Prerequisites, Deadlines & Attempt Cap)
CREATE OR REPLACE FUNCTION public.start_program_quiz_attempt(
  p_quiz_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_quiz public.program_quizzes%ROWTYPE;
  v_course public.program_courses%ROWTYPE;
  v_program public.special_programs%ROWTYPE;
  v_enrollment public.program_enrollments%ROWTYPE;
  v_attempt public.program_quiz_attempts%ROWTYPE;
  v_attempt_count integer;
  v_max_points numeric(6,2);
  v_expires_at timestamptz;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_quiz
  FROM public.program_quizzes
  WHERE id = p_quiz_id;

  IF NOT FOUND OR NOT v_quiz.is_published THEN
    RAISE EXCEPTION 'Quiz not found or not published.';
  END IF;

  SELECT * INTO v_course
  FROM public.program_courses
  WHERE id = v_quiz.course_id;

  IF NOT FOUND OR v_course.status <> 'published' THEN
    RAISE EXCEPTION 'Course is not published.';
  END IF;

  SELECT * INTO v_program
  FROM public.special_programs
  WHERE id = v_course.program_id;

  IF v_program.status IN ('draft', 'archived') THEN
    RAISE EXCEPTION 'Program is not accessible.';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.program_enrollments
  WHERE program_id = v_program.id
    AND student_id = v_student_id
    AND status IN ('active', 'completed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active enrollment is required to take this quiz.';
  END IF;

  IF NOT public.has_met_course_prerequisites(v_course.id, v_enrollment.id) THEN
    RAISE EXCEPTION 'Course prerequisites must be completed before taking this quiz.';
  END IF;

  IF v_quiz.deadline_at IS NOT NULL AND now() > v_quiz.deadline_at THEN
    RAISE EXCEPTION 'The deadline for this quiz has passed.';
  END IF;

  SELECT * INTO v_attempt
  FROM public.program_quiz_attempts
  WHERE quiz_id = p_quiz_id
    AND enrollment_id = v_enrollment.id
    AND status = 'in_progress'
  ORDER BY attempt_number DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at THEN
      UPDATE public.program_quiz_attempts
      SET status = 'expired',
          submitted_at = now()
      WHERE id = v_attempt.id;
    ELSE
      RETURN to_jsonb(v_attempt);
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_attempt_count
  FROM public.program_quiz_attempts
  WHERE quiz_id = p_quiz_id
    AND enrollment_id = v_enrollment.id;

  IF v_attempt_count >= v_quiz.attempts_allowed THEN
    RAISE EXCEPTION 'Maximum allowed attempts (%) reached for this quiz.', v_quiz.attempts_allowed;
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_max_points
  FROM public.program_quiz_questions
  WHERE quiz_id = p_quiz_id;

  v_expires_at := CASE
    WHEN v_quiz.time_limit_minutes IS NOT NULL
      THEN now() + make_interval(mins => v_quiz.time_limit_minutes)
    ELSE NULL
  END;

  INSERT INTO public.program_quiz_attempts (
    quiz_id,
    enrollment_id,
    student_id,
    attempt_number,
    status,
    started_at,
    expires_at,
    max_points
  )
  VALUES (
    p_quiz_id,
    v_enrollment.id,
    v_student_id,
    v_attempt_count + 1,
    'in_progress',
    now(),
    v_expires_at,
    v_max_points
  )
  RETURNING * INTO v_attempt;

  INSERT INTO public.program_activity_logs (
    enrollment_id, student_id, program_id, event_type, entity_id, metadata
  )
  VALUES (
    v_enrollment.id,
    v_student_id,
    v_program.id,
    'quiz_started',
    p_quiz_id,
    jsonb_build_object('attempt_id', v_attempt.id, 'attempt_number', v_attempt.attempt_number)
  );

  RETURN to_jsonb(v_attempt);
END;
$$;

-- 7. Fetch Stripped Quiz Options for Active Student Attempt (Never Exposes is_correct)
CREATE OR REPLACE FUNCTION public.get_program_quiz_options_safe(
  p_attempt_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_attempt public.program_quiz_attempts%ROWTYPE;
  v_options jsonb;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_attempt
  FROM public.program_quiz_attempts
  WHERE id = p_attempt_id
    AND student_id = v_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz attempt not found.';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Quiz options can only be loaded for an active in-progress attempt.';
  END IF;

  IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + interval '15 seconds') THEN
    RAISE EXCEPTION 'This quiz attempt has expired.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pqo.id,
        'question_id', pqo.question_id,
        'option_text', pqo.option_text,
        'display_order', pqo.display_order
      )
      ORDER BY pqq.display_order, pqo.display_order
    ),
    '[]'::jsonb
  ) INTO v_options
  FROM public.program_quiz_options pqo
  JOIN public.program_quiz_questions pqq ON pqq.id = pqo.question_id
  WHERE pqq.quiz_id = v_attempt.quiz_id;

  RETURN v_options;
END;
$$;

-- 8. Server-Side Quiz Grading & Submission
CREATE OR REPLACE FUNCTION public.submit_program_quiz_attempt(
  p_attempt_id uuid,
  p_answers jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_attempt public.program_quiz_attempts%ROWTYPE;
  v_quiz public.program_quizzes%ROWTYPE;
  v_course public.program_courses%ROWTYPE;
  v_q public.program_quiz_questions%ROWTYPE;
  v_raw_ans jsonb;
  v_selected uuid[];
  v_correct uuid[];
  v_is_correct boolean;
  v_pts numeric(6,2);
  v_total_score numeric(6,2) := 0;
  v_total_max numeric(6,2) := 0;
  v_score_pct numeric(5,2) := 0;
  v_passed boolean := false;
  v_eval jsonb;
  v_result jsonb;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_attempt
  FROM public.program_quiz_attempts
  WHERE id = p_attempt_id
    AND student_id = v_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz attempt not found.';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'This quiz attempt has already been finalized (status: %).', v_attempt.status;
  END IF;

  SELECT * INTO v_quiz
  FROM public.program_quizzes
  WHERE id = v_attempt.quiz_id;

  SELECT * INTO v_course
  FROM public.program_courses
  WHERE id = v_quiz.course_id;

  FOR v_q IN
    SELECT * FROM public.program_quiz_questions
    WHERE quiz_id = v_quiz.id
    ORDER BY display_order
  LOOP
    v_raw_ans := COALESCE(p_answers, '{}'::jsonb) -> (v_q.id::text);
    v_selected := '{}'::uuid[];

    IF v_raw_ans IS NOT NULL THEN
      IF jsonb_typeof(v_raw_ans) = 'array' THEN
        SELECT COALESCE(array_agg(DISTINCT pqo.id), '{}'::uuid[])
        INTO v_selected
        FROM jsonb_array_elements_text(v_raw_ans) AS val(txt)
        JOIN public.program_quiz_options pqo
          ON pqo.id = public.try_parse_uuid(val.txt)
         AND pqo.question_id = v_q.id;
      ELSIF jsonb_typeof(v_raw_ans) = 'string' THEN
        SELECT COALESCE(array_agg(DISTINCT pqo.id), '{}'::uuid[])
        INTO v_selected
        FROM public.program_quiz_options pqo
        WHERE pqo.id = public.try_parse_uuid(v_raw_ans #>> '{}')
          AND pqo.question_id = v_q.id;
      END IF;
    END IF;

    SELECT COALESCE(array_agg(pqo.id ORDER BY pqo.id), '{}'::uuid[])
    INTO v_correct
    FROM public.program_quiz_options pqo
    WHERE pqo.question_id = v_q.id
      AND pqo.is_correct = true;

    v_is_correct := (
      cardinality(v_correct) > 0
      AND cardinality(v_selected) = cardinality(v_correct)
      AND v_selected <@ v_correct
      AND v_correct <@ v_selected
    );

    v_pts := CASE WHEN v_is_correct THEN v_q.points ELSE 0 END;
    v_total_score := v_total_score + v_pts;
    v_total_max := v_total_max + v_q.points;

    INSERT INTO public.program_quiz_answers (
      attempt_id,
      question_id,
      selected_option_ids,
      is_correct,
      points_awarded
    )
    VALUES (
      v_attempt.id,
      v_q.id,
      v_selected,
      v_is_correct,
      v_pts
    )
    ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET selected_option_ids = EXCLUDED.selected_option_ids,
        is_correct = EXCLUDED.is_correct,
        points_awarded = EXCLUDED.points_awarded;
  END LOOP;

  IF v_total_max > 0 THEN
    v_score_pct := ROUND((v_total_score / v_total_max) * 100, 2);
  ELSE
    v_score_pct := 0;
  END IF;

  v_passed := (v_score_pct >= v_quiz.pass_mark_percent);

  UPDATE public.program_quiz_attempts
  SET status = 'submitted',
      submitted_at = now(),
      score_points = v_total_score,
      max_points = v_total_max,
      score_percent = v_score_pct,
      passed = v_passed
  WHERE id = v_attempt.id
  RETURNING * INTO v_attempt;

  INSERT INTO public.program_activity_logs (
    enrollment_id, student_id, program_id, event_type, entity_id, metadata
  )
  VALUES (
    v_attempt.enrollment_id,
    v_student_id,
    v_course.program_id,
    'quiz_submitted',
    v_quiz.id,
    jsonb_build_object('attempt_id', v_attempt.id, 'passed', v_passed, 'score_percent', v_score_pct)
  );

  v_eval := public.evaluate_program_completion_and_certificate(v_attempt.enrollment_id);

  v_result := to_jsonb(v_attempt);
  IF NOT v_quiz.show_result_immediately THEN
    v_result := v_result || jsonb_build_object(
      'score_points', NULL,
      'score_percent', NULL,
      'passed', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'attempt', v_result,
    'evaluation', v_eval
  );
END;
$$;

-- 9. Revoke Special Program Certificate (Main Admin only)
CREATE OR REPLACE FUNCTION public.revoke_program_certificate(
  p_certificate_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_cert public.program_certificates%ROWTYPE;
BEGIN
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Only Main Admin can revoke program certificates.';
  END IF;

  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Revocation reason is required.';
  END IF;

  UPDATE public.program_certificates
  SET status = 'revoked',
      revoked_by = auth.uid(),
      revoked_at = now(),
      revoke_reason = btrim(p_reason)
  WHERE id = p_certificate_id
  RETURNING * INTO v_cert;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program certificate not found.';
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
  VALUES (
    auth.uid(),
    'revoke_program_certificate',
    'program_certificates',
    v_cert.student_id,
    jsonb_build_object('certificate_id', p_certificate_id, 'certificate_no', v_cert.certificate_no, 'reason', btrim(p_reason))
  );

  RETURN to_jsonb(v_cert);
END;
$$;

-- 10. Privacy-Safe Certificate Verification (Public / Authenticated)
CREATE OR REPLACE FUNCTION public.verify_program_certificate(
  p_certificate_no text,
  p_verification_token text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', pc.id,
    'certificate_no', pc.certificate_no,
    'verification_token', pc.verification_token,
    'student_name', pc.student_name,
    'reg_no', pc.reg_no,
    'program_title', pc.program_title,
    'status', pc.status,
    'issued_at', pc.issued_at
  )
  FROM public.program_certificates pc
  WHERE UPPER(btrim(pc.certificate_no)) = UPPER(btrim(COALESCE(p_certificate_no, '')))
    AND UPPER(btrim(pc.verification_token)) = UPPER(btrim(COALESCE(p_verification_token, '')))
    AND pc.status = 'valid'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.transition_program_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manage_program_enrollment(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evaluate_program_completion_and_certificate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_lesson_progress_secure(uuid, integer, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_program_quiz_atomic(jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_program_quiz_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_program_quiz_options_safe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_program_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_program_certificate(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_program_certificate(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.transition_program_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manage_program_enrollment(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_program_completion_and_certificate(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_lesson_progress_secure(uuid, integer, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_program_quiz_atomic(jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_program_quiz_attempt(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_program_quiz_options_safe(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_program_quiz_attempt(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_program_certificate(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_program_certificate(text, text) TO anon, authenticated, service_role;

COMMIT;