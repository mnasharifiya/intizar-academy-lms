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
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const now = new Date().toISOString();

  // Do not filter by group_id in frontend.
  // Supabase RLS will return only published exams assigned to this student's group.
  const [examsRes, attemptsRes] = await Promise.all([
    supabase
      .from("cbt_exams")
      .select("*")
      .eq("status", "published")
      .or("start_at.is.null,start_at.lte." + now)
      .or("end_at.is.null,end_at.gte." + now)
      .order("created_at", { ascending: false }),

    supabase
      .from("cbt_attempts")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (examsRes.error) throw examsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const exams = examsRes.data ?? [];
  const examIds = exams.map((exam: any) => exam.id);

  if (!examIds.length) {
    return {
      exams,
      questions: [],
      options: [],
      attempts: attemptsRes.data ?? [],
    };
  }

  const questionsRes = await supabase
    .from("cbt_questions")
    .select("id, exam_id, question_text, question_type, points, sort_order")
    .in("exam_id", examIds)
    .order("sort_order", { ascending: true });

  if (questionsRes.error) throw questionsRes.error;

  const questionIds = (questionsRes.data ?? []).map((question: any) => question.id);

  let optionRows: any[] = [];

  if (questionIds.length) {
    const optionsRes = await supabase
      .from("cbt_options")
      .select("id, question_id, option_text, sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (optionsRes.error) throw optionsRes.error;

    optionRows = optionsRes.data ?? [];
  }

  return {
    exams,
    questions: questionsRes.data ?? [],
    options: optionRows,
    attempts: attemptsRes.data ?? [],
  };
}

`;

text = text.slice(0, start) + replacement + text.slice(end);

fs.writeFileSync(path, text, "utf8");

console.log("Student CBT frontend group filter removed.");
