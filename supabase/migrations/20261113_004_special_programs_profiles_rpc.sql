BEGIN;

CREATE OR REPLACE FUNCTION public.get_program_member_profiles(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_allowed boolean;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_allowed := (
    public.is_main_admin()
    OR public.is_program_lead(p_program_id)
    OR public.is_enrolled_student(p_program_id)
    OR EXISTS (
      SELECT 1 FROM public.program_courses pc
      WHERE pc.program_id = p_program_id
        AND pc.instructor_id = auth.uid()
    )
  );

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to view member profiles for this program.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'reg_no', p.reg_no,
        'role', p.role,
        'level_id', p.level_id,
        'photo', p.photo
      )
      ORDER BY p.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.profiles p
  WHERE p.id IN (
    SELECT pe.student_id FROM public.program_enrollments pe WHERE pe.program_id = p_program_id
    UNION
    SELECT pi.instructor_id FROM public.program_instructors pi WHERE pi.program_id = p_program_id
    UNION
    SELECT pc.instructor_id FROM public.program_courses pc WHERE pc.program_id = p_program_id
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_program_member_profiles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_program_member_profiles(uuid) TO authenticated, service_role;

COMMIT;