import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }

  return env;
}

const env = {
  ...loadEnv(".env"),
  ...loadEnv(".env.local"),
  ...process.env,
};

const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const email = env.INTIZAR_TEST_EMAIL;
const password = env.INTIZAR_TEST_PASSWORD;

console.log("===== INTIZAR AUTHENTICATED READ-ONLY AUDIT =====");
console.log("Supabase URL present:", Boolean(url));
console.log("Anon key present:", Boolean(anon));
console.log("Login email present:", Boolean(email));
console.log("Password present:", Boolean(password));
console.log("Secrets are NOT printed.");

if (!url || !anon || !email || !password) {
  console.log("ERROR: Missing env value.");
  process.exit(1);
}

const supabase = createClient(url, anon);

const login = await supabase.auth.signInWithPassword({ email, password });

if (login.error) {
  console.log("LOGIN ERROR:", login.error.message);
  process.exit(1);
}

console.log("LOGIN: OK");
console.log("User ID:", login.data.user?.id);

async function read(name, columns = "*") {
  const { data, error } = await supabase.from(name).select(columns);
  if (error) {
    console.log(`TABLE ${name}: ERROR - ${error.message}`);
    return [];
  }
  console.log(`TABLE ${name}: ${data?.length ?? 0} rows`);
  return data ?? [];
}

const profiles = await read("profiles", "id,name,email,role,level_id,is_active");
const levels = await read("levels", "id,name,category,description");
const courses = await read("courses", "id,name,description");
const levelCourses = await read("level_courses", "level_id,course_id");
const groups = await read("groups", "id,name,level_id,instructor_id,max_students,is_active");
const groupStudents = await read("group_students", "group_id,student_id");

function short(id) {
  return id ? String(id).slice(0, 8) : "NULL";
}

console.log("\n===== LEVELS DETAIL =====");
for (const l of levels) {
  console.log(`- ${short(l.id)} | ${l.name} | category=${l.category}`);
}

console.log("\n===== USERS SUMMARY =====");
const roleCounts = {};
for (const u of profiles) {
  roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
}
console.log(JSON.stringify(roleCounts, null, 2));

console.log("\n===== GROUPS DETAIL =====");
for (const g of groups) {
  const level = levels.find((l) => l.id === g.level_id);
  const instructor = profiles.find((u) => u.id === g.instructor_id);
  const members = groupStudents.filter((gs) => gs.group_id === g.id);
  console.log(
    `- ${short(g.id)} | ${g.name} | level=${level?.name ?? "MISSING"} | instructor=${instructor?.name ?? "MISSING"} | members=${members.length}/${g.max_students} | active=${g.is_active}`
  );
}

console.log("\n===== STUDENTS BY LEVEL =====");
for (const l of levels) {
  const count = profiles.filter((u) => u.role === "student" && u.level_id === l.id).length;
  console.log(`${l.name}: ${count} students`);
}

console.log("\n===== EXPECTED LEVEL CHECK =====");
for (const name of ["Manager2", "Refresher", "Proposal Managers/Ex-ghaliboun", "Ghaliboun"]) {
  const found = levels.find((l) => String(l.name).toLowerCase() === name.toLowerCase());
  console.log(`${found ? "OK" : "MISSING"}: ${name}`);
}

await supabase.auth.signOut();
console.log("\nDONE. Read-only audit finished.");
