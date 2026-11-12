-- INTIZAR ACADEMY
-- Security Migration 002: Protect profile privileges

BEGIN;

-- Remove table-level privileges from public-facing roles.
REVOKE ALL PRIVILEGES
ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;

-- Remove separately granted column privileges.
REVOKE SELECT
(id, name, email, role, level_id, photo, is_active, rank, background, about, phone, office, created_at, reg_no)
ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

REVOKE INSERT
(id, name, email, role, level_id, photo, is_active, rank, background, about, phone, office, created_at, reg_no)
ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

REVOKE UPDATE
(id, name, email, role, level_id, photo, is_active, rank, background, about, phone, office, created_at, reg_no)
ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

REVOKE REFERENCES
(id, name, email, role, level_id, photo, is_active, rank, background, about, phone, office, created_at, reg_no)
ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Restore authenticated read access, subject to RLS.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Allow users to update ordinary personal information.
GRANT UPDATE (name, photo, about, phone, office)
ON TABLE public.profiles TO authenticated;

-- Harden role lookup.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.get_user_role()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_role()
TO authenticated, service_role;

COMMIT;