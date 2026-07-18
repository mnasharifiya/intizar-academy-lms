const fs = require("fs");

const path = "src/lib/cbtApi.ts";
let text = fs.readFileSync(path, "utf8");

// Replace startCbtAttempt
{
  const start = text.indexOf("export async function startCbtAttempt");
  const end = text.indexOf("export async function submitCbtAttempt", start);

  if (start === -1 || end === -1) {
    console.error("Could not find startCbtAttempt function.");
    process.exit(1);
  }

  const replacement = `export async function startCbtAttempt(examId: string) {
  const { data, error } = await (supabase as any).rpc("start_cbt_attempt_secure", {
    p_exam_id: examId,
  });

  if (error) throw error;

  return data?.attempt ?? data;
}

`;

  text = text.slice(0, start) + replacement + text.slice(end);
}

// Replace submitCbtAttempt
{
  const start = text.indexOf("export async function submitCbtAttempt");
  const next = text.indexOf("\\nexport async function", start + 1);
  const end = next === -1 ? text.length : next;

  if (start === -1) {
    console.error("Could not find submitCbtAttempt function.");
    process.exit(1);
  }

  const replacement = `export async function submitCbtAttempt(
  attemptId: string,
  answersByQuestionId: Record<string, string>
) {
  const { data, error } = await (supabase as any).rpc("submit_cbt_attempt_secure", {
    p_attempt_id: attemptId,
    p_answers: answersByQuestionId || {},
  });

  if (error) throw error;

  return data?.attempt ?? data;
}

`;

  text = text.slice(0, start) + replacement + text.slice(end);
}

fs.writeFileSync(path, text, "utf8");

console.log("CBT start and submit now use secure server-side RPC.");
