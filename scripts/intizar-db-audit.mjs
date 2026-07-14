import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
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

console.log("===== INTIZAR SUPABASE DB AUDIT =====");
console.log("Date:", new Date().toISOString());
console.log("Supabase URL present:", Boolean(url));
console.log("Anon key present:", Boolean(anon));
console.log("Secrets are NOT printed.");

if (!url || !anon) {
  console.log("\nERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env / .env.local");
  process.exit(1);
}

const supabase = createClient(url, anon);

async function readTable(name, columns = "*") {
  const { data, error } = await supabase.from(name).select(columns);
  if (error) {
    console.log(`\nTABLE ${name}: ERROR`);
    console.log(error.message);
    return [];
  }

  console.log(`TABLE ${name}: ${data?.length ?? 0} rows`);
  return data ?? [];
}

const profiles = await readTable(
  "profiles",
  "id,name,email,role,level_id,is_active"
);

const levels = await readTable(
  "levels",
  "id,name,category,description"
);

const courses = await readTable(
  "courses",
  "id,name,description"
);

const levelCourses = await readTable(
  "level_courses",
  "level_id,course_id"
);

const groups = await readTable(
  "groups",
  "id,name,level_id,instructor_id,max_students,is_active"
);

const groupStudents = await readTable(
  "group_students",
  "group_id,student_id"
);

await readTable("lectures", "id,group_id,course_id,instructor_id,title,status,scheduled_time");
await readTable("assignments", "id,group_id,course_id,title,due_date,created_by");
await readTable("submissions", "id,assignment_id,student_id,file_name,submitted_at");
await readTable("grades", "id,student_id,lecture_id,assignment_id,type,score,graded_by");
await readTable("videos", "id,group_id,course_id,instructor_id,title,video_url");
await readTable("learning_materials", "id,group_id,course_id,instructor_id,title,kind,file_type,is_active");

function short(id) {
  return id ? String(id).slice(0, 8) : "NULL";
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

console.log("\n===== LEVELS =====");
if (levels.length === 0) {
  console.log("PROBLEM: No levels found. This is why level dropdown is empty.");
} else {
  for (const l of levels) {
    console.log(`- ${short(l.id)} | ${l.name} | category=${l.category}`);
  }
}

console.log("\n===== USERS SUMMARY =====");
const roleCounts = {};
for (const u of profiles) {
  roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
}
console.log(roleCounts);

const students = profiles.filter((u) => u.role === "student");
const instructors = profiles.filter((u) => u.role === "instructor");
const admins = profiles.filter((u) => u.role === "admin");

console.log("Admins:", admins.length);
console.log("Instructors:", instructors.length);
console.log("Students:", students.length);

console.log("\n===== STUDENTS WITHOUT LEVEL =====");
const studentsWithoutLevel = students.filter((s) => !s.level_id);
if (studentsWithoutLevel.length === 0) {
  console.log("OK: All students have level_id.");
} else {
  for (const s of studentsWithoutLevel) {
    console.log(`- ${short(s.id)} | ${s.name} | ${maskEmail(s.email)} | level_id=NULL`);
  }
}

console.log("\n===== INSTRUCTORS =====");
if (instructors.length === 0) {
  console.log("PROBLEM: No instructors found. Group creation needs instructor accounts.");
} else {
  for (const i of instructors) {
    console.log(`- ${short(i.id)} | ${i.name} | active=${i.is_active}`);
  }
}

console.log("\n===== GROUPS =====");
if (groups.length === 0) {
  console.log("INFO: No groups found yet.");
} else {
  for (const g of groups) {
    const level = levels.find((l) => l.id === g.level_id);
    const instructor = profiles.find((u) => u.id === g.instructor_id);
    const members = groupStudents.filter((gs) => gs.group_id === g.id);
    console.log(
      `- ${short(g.id)} | ${g.name} | level=${level?.name ?? "MISSING"} | instructor=${instructor?.name ?? "MISSING"} | members=${members.length}/${g.max_students} | active=${g.is_active}`
    );
  }
}

console.log("\n===== GROUP ASSIGNMENT CHECK =====");
const assignedStudentIds = new Set(groupStudents.map((gs) => gs.student_id));
const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id));

console.log("Assigned students:", assignedStudentIds.size);
console.log("Unassigned students:", unassignedStudents.length);

for (const s of unassignedStudents) {
  const level = levels.find((l) => l.id === s.level_id);
  console.log(`- Unassigned: ${short(s.id)} | ${s.name} | level=${level?.name ?? "NULL/MISSING"}`);
}

console.log("\n===== STUDENTS IN MULTIPLE GROUPS =====");
const studentGroupCounter = {};
for (const gs of groupStudents) {
  studentGroupCounter[gs.student_id] = (studentGroupCounter[gs.student_id] || 0) + 1;
}

const duplicateAssignments = Object.entries(studentGroupCounter).filter(([, count]) => count > 1);
if (duplicateAssignments.length === 0) {
  console.log("OK: No student is assigned to multiple groups.");
} else {
  for (const [studentId, count] of duplicateAssignments) {
    const student = profiles.find((u) => u.id === studentId);
    console.log(`PROBLEM: ${student?.name ?? studentId} is assigned to ${count} groups.`);
  }
}

console.log("\n===== ELIGIBLE STUDENTS PER GROUP =====");
for (const g of groups) {
  const level = levels.find((l) => l.id === g.level_id);
  const members = new Set(groupStudents.filter((gs) => gs.group_id === g.id).map((gs) => gs.student_id));

  const eligible = students.filter(
    (s) => s.level_id === g.level_id && !members.has(s.id)
  );

  console.log(`${g.name}: ${eligible.length} eligible students with same level (${level?.name ?? "MISSING"})`);
}

console.log("\n===== EXPECTED CORE LEVELS =====");
const expected = [
  "Manager2",
  "Refresher",
  "Proposal Managers/Ex-ghaliboun",
  "Ghaliboun",
];

for (const name of expected) {
  const exists = levels.some((l) => String(l.name).toLowerCase() === name.toLowerCase());
  console.log(`${exists ? "OK" : "MISSING"}: ${name}`);
}

console.log("\n===== FINAL DB AUDIT DONE =====");
