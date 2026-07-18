const fs = require("fs");

const path = "src/lib/cbtApi.ts";
let text = fs.readFileSync(path, "utf8");

const start = text.indexOf("export async function submitCbtAttempt");
const next = text.indexOf("\nexport async function", start + 1);
const end = next === -1 ? text.length : next;

if (start === -1) {
  console.error("Could not find submitCbtAttempt function.");
  process.exit(1);
}

const replacement = `export async function submitCbtAttempt(
  attemptId: string,
  answers:
    | Record<string, string>
    | Array<{ questionId: string; selectedOptionId: string }>
) {
  const answersByQuestionId = Array.isArray(answers)
    ? answers.reduce((acc: Record<string, string>, row: any) => {
        if (row?.questionId && row?.selectedOptionId) {
          acc[row.questionId] = row.selectedOptionId;
        }

        return acc;
      }, {})
    : answers || {};

  const { data, error } = await (supabase as any).rpc("submit_cbt_attempt_secure", {
    p_attempt_id: attemptId,
    p_answers: answersByQuestionId,
  });

  if (error) throw error;

  return data?.attempt ?? data;
}

`;

text = text.slice(0, start) + replacement + text.slice(end);

fs.writeFileSync(path, text, "utf8");

console.log("Secure CBT submit now accepts student answer rows and converts them.");
