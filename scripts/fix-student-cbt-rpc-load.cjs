const fs = require("fs");

const path = "src/lib/cbtApi.ts";
let text = fs.readFileSync(path, "utf8");

const start = text.indexOf("export async function loadStudentCbtData");
const end = text.indexOf("export async function startCbtAttempt", start);

if (start === -1 || end === -1) {
  console.error("Could not find loadStudentCbtData function.");
  process.exit(1);
}

const replacement = `export async function loadStudentCbtData(_groupIds: string[]) {
  const { data, error } = await (supabase as any).rpc("get_student_cbt_data");

  if (error) throw error;

  return {
    exams: data?.exams ?? [],
    questions: data?.questions ?? [],
    options: data?.options ?? [],
    attempts: data?.attempts ?? [],
  };
}

`;

text = text.slice(0, start) + replacement + text.slice(end);

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT now loads using secure RPC.");
