const fs = require("fs");

const path = "src/lib/cbtApi.ts";
let text = fs.readFileSync(path, "utf8");

// Replace loadCbtExams so instructor sees only his own exams, admin sees all
text = text.replace(
/export async function loadCbtExams\(\) \{[\s\S]*?\n\}\n\nexport async function saveCbtExam/,
`export async function loadCbtExams() {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const profileRes = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error) throw profileRes.error;

  const role = (profileRes.data as any)?.role;

  let examQuery = supabase
    .from("cbt_exams")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "instructor") {
    examQuery = examQuery.eq("instructor_id", userId);
  }

  const examsRes = await examQuery;

  if (examsRes.error) throw examsRes.error;

  const exams = examsRes.data ?? [];
  const examIds = exams.map((exam: any) => exam.id);

  if (!examIds.length) {
    return {
      exams: [],
      questions: [],
      options: [],
      attempts: [],
    };
  }

  const [questionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("cbt_questions")
      .select("*")
      .in("exam_id", examIds)
      .order("sort_order", { ascending: true }),

    supabase
      .from("cbt_attempts")
      .select("*")
      .in("exam_id", examIds)
      .order("created_at", { ascending: false }),
  ]);

  if (questionsRes.error) throw questionsRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  const questionIds = (questionsRes.data ?? []).map((question: any) => question.id);

  let optionRows: any[] = [];

  if (questionIds.length) {
    const optionsRes = await supabase
      .from("cbt_options")
      .select("*")
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

export async function saveCbtExam`
);

// Replace loadStudentCbtData so it fetches student's real group memberships too
text = text.replace(
/export async function loadStudentCbtData\(groupIds: string\[\]\) \{[\s\S]*?\n\}\n\nexport async function startCbtAttempt/,
`export async function loadStudentCbtData(groupIds: string[]) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;

  if (!userId) throw new Error("You must be logged in.");

  const membershipRes = await (supabase as any)
    .from("group_students")
    .select("*")
    .eq("student_id", userId);

  const membershipGroupIds = (membershipRes.data ?? [])
    .map((row: any) => row.group_id || row.groupId)
    .filter(Boolean);

  const finalGroupIds = Array.from(new Set([...(groupIds ?? []), ...membershipGroupIds]));

  if (!finalGroupIds.length) {
    return {
      exams: [],
      questions: [],
      options: [],
      attempts: [],
    };
  }

  const now = new Date().toISOString();

  const [examsRes, attemptsRes] = await Promise.all([
    supabase
      .from("cbt_exams")
      .select("*")
      .eq("status", "published")
      .in("group_id", finalGroupIds)
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

export async function startCbtAttempt`
);

fs.writeFileSync(path, text, "utf8");
console.log("CBT frontend scope fixed.");
