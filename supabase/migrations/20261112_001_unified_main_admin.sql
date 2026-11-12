BEGIN;

CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_admins sa
    JOIN public.profiles p ON p.id = sa.user_id
    WHERE sa.user_id = auth.uid()
      AND p.role = 'admin'
      AND COALESCE(p.is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_main_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_main_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_main_admin() TO authenticated, service_role;

ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.system_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.system_admins TO authenticated;
GRANT ALL ON TABLE public.system_admins TO service_role;

DROP POLICY IF EXISTS "system_admins_select" ON public.system_admins;
CREATE POLICY "system_admins_select"
  ON public.system_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_main_admin());

CREATE OR REPLACE FUNCTION public.prevent_last_main_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.system_admins
  WHERE user_id <> OLD.user_id;

  IF remaining_count < 1 THEN
    RAISE EXCEPTION 'Cannot remove the last remaining Main Admin account.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_main_admin_delete ON public.system_admins;
CREATE TRIGGER trg_prevent_last_main_admin_delete
  BEFORE DELETE ON public.system_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_main_admin_delete();

ALTER TABLE public.admin_groups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_groups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_groups TO authenticated;
GRANT ALL ON TABLE public.admin_groups TO service_role;

DROP POLICY IF EXISTS "Admins can manage admin group access" ON public.admin_groups;
DROP POLICY IF EXISTS "admin_groups_select" ON public.admin_groups;
DROP POLICY IF EXISTS "admin_groups_insert" ON public.admin_groups;
DROP POLICY IF EXISTS "admin_groups_update" ON public.admin_groups;
DROP POLICY IF EXISTS "admin_groups_delete" ON public.admin_groups;

CREATE POLICY "admin_groups_select"
  ON public.admin_groups
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid() OR public.is_main_admin());

CREATE POLICY "admin_groups_insert"
  ON public.admin_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_main_admin());

CREATE POLICY "admin_groups_update"
  ON public.admin_groups
  FOR UPDATE
  TO authenticated
  USING (public.is_main_admin())
  WITH CHECK (public.is_main_admin());

CREATE POLICY "admin_groups_delete"
  ON public.admin_groups
  FOR DELETE
  TO authenticated
  USING (public.is_main_admin());

CREATE OR REPLACE FUNCTION public.auto_assign_creator_admin_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  IF caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = caller_id
    AND COALESCE(is_active, true) = true;

  IF caller_role = 'admin' AND NOT public.is_main_admin() THEN
    INSERT INTO public.admin_groups (admin_id, group_id)
    VALUES (caller_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_creator_admin_group ON public.groups;
CREATE TRIGGER trg_auto_assign_creator_admin_group
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_creator_admin_group();

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;
GRANT ALL ON TABLE public.admin_audit_logs TO service_role;

DROP POLICY IF EXISTS "admin_audit_logs_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_main_admin());

CREATE OR REPLACE FUNCTION public.log_admin_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'system_admins' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
      VALUES (auth.uid(), 'grant_main_admin', 'system_admins', NEW.user_id, jsonb_build_object('granted_by', NEW.granted_by));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
      VALUES (auth.uid(), 'revoke_main_admin', 'system_admins', OLD.user_id, '{}'::jsonb);
      RETURN OLD;
    END IF;
  ELSIF TG_TABLE_NAME = 'admin_groups' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
      VALUES (auth.uid(), 'assign_admin_group', 'admin_groups', NEW.admin_id, jsonb_build_object('group_id', NEW.group_id));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.admin_audit_logs (actor_id, action, target_table, target_user_id, details)
      VALUES (auth.uid(), 'remove_admin_group', 'admin_groups', OLD.admin_id, jsonb_build_object('group_id', OLD.group_id));
      RETURN OLD;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_system_admins ON public.system_admins;
CREATE TRIGGER trg_audit_system_admins
  AFTER INSERT OR DELETE ON public.system_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_privilege_change();

DROP TRIGGER IF EXISTS trg_audit_admin_groups ON public.admin_groups;
CREATE TRIGGER trg_audit_admin_groups
  AFTER INSERT OR DELETE ON public.admin_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_privilege_change();

COMMIT;