import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const formatUser = (p: Record<string, unknown>) => ({
  id: p.id,
  name: p.name,
  email: p.email,
  role: p.role,
  levelId: p.level_id,
  regNo: p.reg_no ?? null,
  photo: p.photo,
  isActive: p.is_active,
  rank: p.rank ?? "",
  background: p.background ?? "",
  about: p.about ?? "",
  contacts: { email: p.email, phone: p.phone ?? "", office: p.office ?? "" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const callerId = userData.user.id;
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active")
      .eq("id", callerId)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
      return jsonResponse({ error: "Forbidden: admin privileges required" }, 403);
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "create-user") {
      const body = await req.json();
      const { name, email, password, role, levelId, rank, background, about, phone, office } = body;

      const allowedRoles = ["admin", "instructor", "student"];
      const targetRole = allowedRoles.includes(role) ? role : "student";

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (authError || !authData?.user) {
        return jsonResponse({ error: authError?.message ?? "Auth creation failed" }, 400);
      }

      const userId = authData.user.id;

      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          name: name ?? "",
          email: email ?? "",
          role: targetRole,
          level_id: levelId ?? null,
          rank: rank ?? "",
          background: background ?? "",
          about: about ?? "",
          phone: phone ?? "",
          office: office ?? "",
          is_active: true,
        })
        .select()
        .single();

      if (pErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return jsonResponse({ error: pErr.message }, 400);
      }

      return jsonResponse(formatUser(profile as Record<string, unknown>));
    }

    if (action === "update-user") {
      const body = await req.json();
      const { userId, updates } = body;

      if (!userId || typeof userId !== "string") {
        return jsonResponse({ error: "Missing userId" }, 400);
      }

      if (!updates || typeof updates !== "object") {
        return jsonResponse({ error: "Missing updates payload" }, 400);
      }

      if (userId === callerId && updates.isActive === false) {
        return jsonResponse({ error: "Cannot deactivate your own admin account" }, 400);
      }

      const dbUpdates: Record<string, unknown> = {};
      if ("photo" in updates) dbUpdates.photo = updates.photo;
      if ("isActive" in updates) dbUpdates.is_active = Boolean(updates.isActive);
      if ("levelId" in updates) dbUpdates.level_id = updates.levelId;
      if ("regNo" in updates) dbUpdates.reg_no = updates.regNo;
      if ("name" in updates) dbUpdates.name = updates.name;
      if ("rank" in updates) dbUpdates.rank = updates.rank;
      if ("background" in updates) dbUpdates.background = updates.background;
      if ("about" in updates) dbUpdates.about = updates.about;
      if ("phone" in updates) dbUpdates.phone = updates.phone;
      if ("office" in updates) dbUpdates.office = updates.office;

      if (Object.keys(dbUpdates).length === 0) {
        return jsonResponse({ error: "No valid fields provided for update" }, 400);
      }

      const { data: profile, error: uErr } = await supabaseAdmin
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId)
        .select()
        .single();

      if (uErr || !profile) {
        return jsonResponse({ error: uErr?.message ?? "Failed to update user" }, 400);
      }

      return jsonResponse(formatUser(profile as Record<string, unknown>));
    }

    if (action === "delete-user") {
      const body = await req.json();
      const { userId } = body;

      if (!userId || typeof userId !== "string") {
        return jsonResponse({ error: "Missing userId" }, 400);
      }

      if (userId === callerId) {
        return jsonResponse({ error: "Cannot delete your own admin account" }, 400);
      }

      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
